import DataLoader from 'dataloader';
import {
  MergedDeepQuery,
  DeepQuery,
  DeepQueryResponsePaginationMapped,
  DeepQueryResponse,
  mergeQueries,
} from '../../../mongoose/query-builder';
import { NoteQueryType } from '../mongo-query-mapper/note';
import { NoteTextField } from '../../types.generated';
import revisionRecordsPagination, {
  CollabTextRevisionRecordsPaginationOutput,
  assertRecordRevisionDefined,
  mapRevisionRecordsPaginationInputToOutput,
} from '../../../mongoose/operations/pagination/revisionRecordsPagination';
import userNoteLookup, {
  UserNoteLookupInput,
} from '../../../mongoose/operations/lookup/userNoteLookup';
import {
  RelayPagination,
  getPaginationKey,
  paginationStringToInt,
  relayArrayPaginationMapOutputToInput,
} from '../../../mongoose/operations/pagination/relayArrayPagination';
import { CollaborativeDocumentQueryType } from '../../collab/mongo-query-mapper/collaborative-document';
import { RevisionRecordQueryType } from '../../collab/mongo-query-mapper/revision-record';

import { GraphQLError } from 'graphql';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import mapObject, { mapObjectSkip } from 'map-obj';
import { GraphQLResolversContext } from '../../context';

import sortObject from '~utils/sortObject';
import { ObjectId } from 'mongodb';
import relayPaginateUserNotesArray, {
  RelayPaginateUserNotesArrayOuput,
} from '../../../mongoose/operations/pagination/relayPaginateUserNotesArray';

import util from 'util';

export default class NotesDataSource {
  async getByPublicId(key: LoaderKey) {
    throw new Error('not implemented');
  }

  async getPaginateDefaultCategory(key: UserNotesArrayKey) {
    throw new Error('not implemented');
  }
}

type UserNoteDeepQueryResponse = DeepQueryResponse<Omit<NoteQueryType, 'note'>> & {
  note?: DeepQueryResponse<Omit<NoteQueryType['note'], 'collabText'>> & {
    collabText?: Record<
      NoteTextField,
      DeepQueryResponse<Omit<CollaborativeDocumentQueryType, 'records'>> & {
        records?: CollabTextRevisionRecordsPaginationOutput<
          DeepQueryResponse<RevisionRecordQueryType>
        >;
      }
    >;
  };
};

function userNoteQueryToLookupInput(
  userNoteQuery: MergedDeepQuery<NoteQueryType>,
  context: NotesLoaderContext
): UserNoteLookupInput<NoteTextField> {
  const { note: noteQuery, ...queryAllExceptNote } = userNoteQuery;

  const userNote_note_Project: Record<string, unknown> = {
    publicId: 1,
  };

  const userNoteProject: MergedDeepQuery<NoteQueryType> = { ...queryAllExceptNote };
  if (!userNoteProject._id) {
    userNoteProject._id = 0;
  }

  let noteLookupInput: UserNoteLookupInput<NoteTextField>['note'] | undefined = undefined;
  let collabTextLookupInput:
    | UserNoteLookupInput<NoteTextField>['collabText']
    | undefined = undefined;
  if (noteQuery) {
    const { id, collabText, ...noteProject } = noteQuery;

    if (id) {
      userNote_note_Project.id = 1;
    }

    if (Object.keys(noteProject).length > 0) {
      noteLookupInput = {
        collectionName: context.Note.collection.collectionName,
        pipeline: [{ $project: noteProject }],
      };
      Object.assign(userNote_note_Project, noteProject);
    }

    if (collabText) {
      collabTextLookupInput = {
        collectionName: context.CollabText.collection.collectionName,
        collabText: mapObject(collabText, (key, query) => {
          if (!query) return mapObjectSkip;

          return [
            key,
            {
              pipeline: [
                ...(query.records?.$paginations
                  ? [
                      {
                        $set: {
                          records: revisionRecordsPagination({
                            defaultSlice: 'end',
                            paginations:
                              query.records.$paginations.map(paginationStringToInt),
                          }),
                        },
                      },
                    ]
                  : []),
                {
                  $project: {
                    ...query,
                    records: query.records?.$query
                      ? {
                          array: {
                            ...query.records.$query,
                            revision: 1,
                          },
                          sizes: 1,
                        }
                      : undefined,
                  },
                },
              ],
            },
          ];
        }),
      };
      userNote_note_Project.collabText = 1;
    }
  }

  return {
    note: noteLookupInput,
    collabText: collabTextLookupInput,
    postLookup: [
      {
        $project: {
          ...userNoteProject,
          ...(Object.keys(userNote_note_Project).length > 0
            ? { note: userNote_note_Project }
            : {}),
        },
      },
    ],
  };
}

function userNoteResponseToPaginationsMapped(
  userNote: UserNoteDeepQueryResponse,
  noteQuery: MergedDeepQuery<NoteQueryType> | undefined
): DeepQueryResponsePaginationMapped<NoteQueryType> {
  return {
    ...userNote,
    note: {
      ...userNote.note,
      collabText: collabTextResponseToPaginationsMapped(
        userNote.note?.collabText,
        noteQuery?.note?.collabText
      ),
    },
  };
}

function collabTextResponseToPaginationsMapped(
  collabTextMap: NonNullable<UserNoteDeepQueryResponse['note']>['collabText'],
  collabTextQuery:
    | MergedDeepQuery<Record<NoteTextField, CollaborativeDocumentQueryType>>
    | undefined
): DeepQueryResponsePaginationMapped<
  Record<NoteTextField, CollaborativeDocumentQueryType>
> {
  if (!collabTextQuery || !collabTextMap) {
    return mapObject(NoteTextField, (_key, value) => [value, {}]);
  }

  return mapObject(collabTextQuery, (key, query) => {
    const collabTextMappedPaginations: Required<
      DeepQueryResponsePaginationMapped<Pick<CollaborativeDocumentQueryType, 'records'>>
    > &
      DeepQueryResponsePaginationMapped<CollaborativeDocumentQueryType> = {
      ...collabTextMap[key],
      records: {},
    };

    if (!query?.records?.$paginations) return [key, collabTextMappedPaginations];

    const paginationQueryInput = query.records.$paginations.map(paginationStringToInt);
    const paginationOutput = collabTextMap[key].records;
    if (!paginationOutput) {
      throw new Error('Expected pagination result');
    }

    assertRecordRevisionDefined(paginationOutput);
    const recordsGroupedByInput = mapRevisionRecordsPaginationInputToOutput(
      paginationQueryInput,
      paginationOutput
    );

    for (let i = 0; i < paginationQueryInput.length; i++) {
      const pagination = paginationQueryInput[i];
      if (!pagination) continue;
      const recordsByInput = recordsGroupedByInput[i];
      if (!recordsByInput) continue;

      collabTextMappedPaginations.records[getPaginationKey(pagination)] = recordsByInput;
    }

    return [key, collabTextMappedPaginations];
  });
}

function mapUserNoteByPublicIdAndMapPaginations(
  userNotes: UserNoteDeepQueryResponse[],
  userNoteQuery: MergedDeepQuery<NoteQueryType>
): Record<string, DeepQueryResponsePaginationMapped<NoteQueryType>> {
  return userNotes.reduce<
    Record<string, DeepQueryResponsePaginationMapped<NoteQueryType>>
  >((retMap, userNote) => {
    const publicId = userNote.note?.publicId;
    if (!publicId) {
      throw new Error('Expected field note.publicId in UserNote response');
    }

    retMap[publicId] = userNoteResponseToPaginationsMapped(userNote, userNoteQuery);

    return retMap;
  }, {});
}

function userNoteQueryPaginationMappedToResponse(
  userNote: DeepQueryResponsePaginationMapped<NoteQueryType>,
  userNoteQuery: DeepQuery<NoteQueryType>
): DeepQueryResponse<NoteQueryType> {
  return {
    ...userNote,
    note: {
      ...userNote.note,
      collabText: userNoteQuery.note?.collabText
        ? mapObject(userNoteQuery.note.collabText, (collabKey, query) => {
            if (!query) return mapObjectSkip;

            const collabText = userNote.note?.collabText?.[collabKey];

            if (!query.records?.$pagination) {
              return [collabKey, { ...collabText, records: [] }];
            }

            const paginationKey = getPaginationKey(query.records.$pagination);
            const records = collabText?.records?.[paginationKey] ?? [];
            return [collabKey, { ...collabText, records }];
          })
        : undefined,
    },
  };
}

/**
 * Given two objects A and B with same contents, but A !== B => getEqualObjectString(A) === getEqualObjectString(B)
 */
function getEqualObjectString(obj: unknown) {
  // convert objectIds to string...
  return JSON.stringify(sortObject(obj), null, undefined);
}

interface LoaderKey {
  publicId: string;
  noteQuery: DeepQuery<NoteQueryType>;
}

type NotesLoaderContext = Pick<
  GraphQLResolversContext['mongoose']['model'],
  'UserNote' | 'CollabText' | 'Note'
>;

async function notesLoaderFn(
  keys: Readonly<LoaderKey[]>,
  context: NotesLoaderContext
): Promise<(DeepQueryResponse<NoteQueryType> | Error)[]> {
  // Gather publicIds
  const allPublicIds = keys.map(({ publicId }) => publicId);
  // Merge queries
  const mergedQuery = mergeQueries(
    {},
    keys.map(({ noteQuery }) => noteQuery)
  );


  // Build aggregate query
  const userNoteLookupInput = userNoteQueryToLookupInput(mergedQuery, context);

  // Fetch data
  const userNotesResult = await context.UserNote.aggregate<UserNoteDeepQueryResponse>([
    {
      $match: {
        'note.publicId': {
          $in: allPublicIds,
        },
      },
    },
    ...userNoteLookup(userNoteLookupInput),
  ]);

  // Map paginations to original query
  const noteByPublicId = mapUserNoteByPublicIdAndMapPaginations(
    userNotesResult,
    mergedQuery
  );

  return keys.map((key) => {
    const userNote = noteByPublicId[key.publicId];
    if (!userNote) {
      return new GraphQLError(`Note '${key.publicId}' not found`, {
        extensions: {
          code: GraphQLErrorCode.NotFound,
        },
      });
    }

    return userNoteQueryPaginationMappedToResponse(userNote, key.noteQuery);
  });
}

export class NotesLoader {
  private context: Readonly<NotesLoaderContext>;

  constructor(context: Readonly<NotesLoaderContext>) {
    this.context = context;
  }

  private loader = new DataLoader<LoaderKey, DeepQueryResponse<NoteQueryType>, string>(
    async (keys) => notesLoaderFn(keys, this.context),
    {
      cacheKeyFn: getEqualObjectString,
    }
  );

  get(key: LoaderKey) {
    return this.loader.load(key);
  }
}

// TODO implement below
interface UserNotesArrayKey {
  pagination: RelayPagination<ObjectId>;
  noteQuery: DeepQuery<NoteQueryType>;
}

interface UserNotesArrayLoaderContext {
  models: Pick<
    GraphQLResolversContext['mongoose']['model'],
    'User' | 'UserNote' | 'CollabText' | 'Note'
  >;
  userId: ObjectId;
  userNotesArrayPath: string;
}

async function userNotesArrayLoaderFn(
  keys: Readonly<UserNotesArrayKey[]>,
  context: UserNotesArrayLoaderContext
): Promise<(DeepQueryResponse<NoteQueryType>[] | Error)[]> {
  // Merge queries
  const mergedQuery = mergeQueries(
    {},
    keys.map(({ noteQuery }) => noteQuery)
  );

  const allPaginations = keys.reduce<RelayPagination<ObjectId>[]>(
    (list, { pagination }) => {
      list.push(pagination);
      return list;
    },
    []
  );

  // Build userNote aggregate query
  const userNoteLookupInput = userNoteQueryToLookupInput(mergedQuery, context.models);

  const userNotesResults = await context.models.User.aggregate<
    RelayPaginateUserNotesArrayOuput<UserNoteDeepQueryResponse>
  >([
    {
      $match: {
        _id: context.userId,
      },
    },
    {
      $project: {
        order: `$${context.userNotesArrayPath}`,
      },
    },
    ...relayPaginateUserNotesArray({
      pagination: {
        arrayFieldPath: 'order',
        paginations: allPaginations,
      },
      userNotes: {
        userNoteCollctionName: context.models.UserNote.collection.collectionName,
        userNoteLookupInput,
      },
    }),
  ]);

  const userNotesResult = userNotesResults[0];
  if (!userNotesResult) {
    throw new Error(`Expected User aggregate to return data`);
  }

  const userNotesByQueryPaginations = relayArrayPaginationMapOutputToInput(
    allPaginations,
    userNotesResult.userNotes
  );

  const userNotesByPaginationKey: Record<string, UserNoteDeepQueryResponse[]> = {};
  for (let i = 0; i < allPaginations.length; i++) {
    const pagination = allPaginations[i];
    if (!pagination) continue;
    const userNotes = userNotesByQueryPaginations[i];
    if (!userNotes) continue;

    userNotesByPaginationKey[getPaginationKey(pagination)] = userNotes;
  }

  return keys.map((key) => {
    const userNotes = userNotesByPaginationKey[getPaginationKey(key.pagination)];
    if (!userNotes) {
      throw new Error(
        `Notes not found for pagination ${getPaginationKey(key.pagination)}`
      );
    }

    const userNotesPaginationsMapped = userNotes.map((userNote) =>
      userNoteResponseToPaginationsMapped(userNote, mergeQueries({}, [key.noteQuery]))
    );

    // TODO can cache this with key publicId, key.noteQuery
    return userNotesPaginationsMapped.map((userNote) =>
      userNoteQueryPaginationMappedToResponse(userNote, key.noteQuery)
    );
  });
}

export class UserNotesArrayLoader {
  private context: Readonly<UserNotesArrayLoaderContext>;

  constructor(context: Readonly<UserNotesArrayLoaderContext>) {
    this.context = context;
  }

  private loader = new DataLoader<
    UserNotesArrayKey,
    DeepQueryResponse<NoteQueryType>[],
    string
  >((keys) => userNotesArrayLoaderFn(keys, this.context), {
    cacheKeyFn: getEqualObjectString,
  });

  get(key: UserNotesArrayKey) {
    return this.loader.load(key);
  }
}
