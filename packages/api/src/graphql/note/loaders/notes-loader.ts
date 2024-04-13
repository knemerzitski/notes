import DataLoader from 'dataloader';
import {
  MergedProjection,
  Projection,
  ProjectionMappedPagination,
  ProjectionResult,
  mergeProjections,
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
} from '../../../mongoose/operations/pagination/relayArrayPagination';
import { CollaborativeDocumentQueryType } from '../../collab/mongo-query-mapper/collaborative-document';
import { RevisionRecordQueryType } from '../../collab/mongo-query-mapper/revision-record';

import { GraphQLError } from 'graphql';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import mapObject, { mapObjectSkip } from 'map-obj';
import { GraphQLResolversContext } from '../../context';

import sortObject from '~utils/sortObject';
import { ObjectId } from 'mongodb';
import relayPaginateUserNotesArray from '../../../mongoose/operations/pagination/relayPaginateUserNotesArray';
import { UserNotesArrayLookupOutput } from '../../../mongoose/operations/lookup/userNotesArrayLookup';

import util from 'util';

type MongoAggregateUserNoteResult = ProjectionResult<Omit<NoteQueryType, 'note'>> & {
  note?: ProjectionResult<Omit<NoteQueryType['note'], 'collabText'>> & {
    collabText?: Record<
      NoteTextField,
      ProjectionResult<Omit<CollaborativeDocumentQueryType, 'records'>> & {
        records?: CollabTextRevisionRecordsPaginationOutput<
          ProjectionResult<RevisionRecordQueryType>
        >;
      }
    >;
  };
};

function queryToNoteLookupInput(
  userNoteQuery: MergedProjection<NoteQueryType>,
  context: NotesLoaderContext
): UserNoteLookupInput<NoteTextField> {
  const { note: noteQuery, ...queryAllExceptNote } = userNoteQuery;

  const userNote_note_Project: Record<string, unknown> = {
    publicId: 1,
  };

  const userNoteProject: MergedProjection<NoteQueryType> = { ...queryAllExceptNote };
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
                    records: query.records?.$project
                      ? {
                          array: {
                            ...query.records.$project,
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

function mapUserNotePaginations(
  noteQuery: MergedProjection<NoteQueryType> | undefined,
  userNote: MongoAggregateUserNoteResult
): ProjectionMappedPagination<NoteQueryType> {
  return {
    ...userNote,
    note: {
      ...userNote.note,
      collabText: mapCollabTextRecordsByPagination(
        noteQuery?.note?.collabText,
        userNote.note?.collabText
      ),
    },
  };
}

function mapCollabTextRecordsByPagination(
  collabTextQuery:
    | MergedProjection<Record<NoteTextField, CollaborativeDocumentQueryType>>
    | undefined,
  collabText: NonNullable<MongoAggregateUserNoteResult['note']>['collabText']
): ProjectionMappedPagination<Record<NoteTextField, CollaborativeDocumentQueryType>> {
  if (!collabTextQuery || !collabText) {
    return mapObject(NoteTextField, (_key, value) => [value, {}]);
  }

  return mapObject(collabTextQuery, (key, query) => {
    const collabTextMappedPaginations: Required<
      ProjectionMappedPagination<Pick<CollaborativeDocumentQueryType, 'records'>>
    > &
      ProjectionMappedPagination<CollaborativeDocumentQueryType> = {
      ...collabText[key],
      records: {},
    };

    if (!query?.records?.$paginations) return [key, collabTextMappedPaginations];

    const paginationInput = query.records.$paginations.map(paginationStringToInt);
    const paginationOutput = collabText[key].records;
    if (!paginationOutput) {
      throw new Error('Expected pagination result');
    }

    assertRecordRevisionDefined(paginationOutput);
    const recordsGroupedByInput = mapRevisionRecordsPaginationInputToOutput(
      paginationInput,
      paginationOutput
    );

    for (let i = 0; i < paginationInput.length; i++) {
      const pagination = paginationInput[i];
      if (!pagination) continue;
      const recordsByInput = recordsGroupedByInput[i];
      if (!recordsByInput) continue;

      collabTextMappedPaginations.records[getPaginationKey(pagination)] = recordsByInput;
    }

    return [key, collabTextMappedPaginations];
  });
}

function mapUserNoteByPublicIdAndMapPaginations(
  userNotesResult: MongoAggregateUserNoteResult[],
  userNoteQuery: MergedProjection<NoteQueryType>
): Record<string, ProjectionMappedPagination<NoteQueryType>> {
  return userNotesResult.reduce<
    Record<string, ProjectionMappedPagination<NoteQueryType>>
  >((retMap, userNote) => {
    const publicId = userNote.note?.publicId;
    if (!publicId) {
      throw new Error('Expected field note.publicId in UserNote response');
    }

    retMap[publicId] = mapUserNotePaginations(userNoteQuery, userNote);

    return retMap;
  }, {});
}

function getProjectionResult(
  userNote: ProjectionMappedPagination<NoteQueryType>,
  userNoteQuery?: Projection<NoteQueryType>
): ProjectionResult<NoteQueryType> {
  return {
    ...userNote,
    note: {
      ...userNote.note,
      collabText: userNoteQuery?.note?.collabText
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
  query: Projection<NoteQueryType>;
}

type NotesLoaderContext = Pick<
  GraphQLResolversContext['mongoose']['model'],
  'UserNote' | 'CollabText' | 'Note'
>;

export default class NotesLoader {
  private context: Readonly<NotesLoaderContext>;

  constructor(context: Readonly<NotesLoaderContext>) {
    this.context = context;
  }

  private loader = new DataLoader<LoaderKey, ProjectionResult<NoteQueryType>, string>(
    async (keys) => {
      // Gather publicIds
      const allPublicIds = keys.map(({ publicId }) => publicId);

      // Merge queries
      const mergedQuery = mergeProjections(
        {},
        keys.map(({ query }) => query)
      );

      // Build aggregate query
      const userNoteLookupInput = queryToNoteLookupInput(mergedQuery, this.context);

      // Fetch data
      const userNotesResult =
        await this.context.UserNote.aggregate<MongoAggregateUserNoteResult>([
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

      // console.log(util.inspect(noteByPublicId, false, null, true));

      return keys.map((key) => {
        const userNote = noteByPublicId[key.publicId];
        if (!userNote) {
          return new GraphQLError(`Note '${key.publicId}' not found`, {
            extensions: {
              code: GraphQLErrorCode.NotFound,
            },
          });
        }

        return getProjectionResult(userNote, key.query);
      });
    },
    {
      cacheKeyFn: getEqualObjectString,
    }
  );

  get(notePublicId: LoaderKey['publicId'], query: LoaderKey['query']) {
    return this.loader.load({
      publicId: notePublicId,
      query,
    });
  }
}

// TODO implement below
interface UserNotesArrayKey {
  pagination: RelayPagination<ObjectId>;
  noteQuery: Projection<NoteQueryType>;
}

interface UserNotesArrayLoaderContext {
  models: Pick<
    GraphQLResolversContext['mongoose']['model'],
    'User' | 'UserNote' | 'CollabText' | 'Note'
  >;
  userId: ObjectId;
  userNotesArrayPath: string;
}

export class UserNotesArrayLoader {
  private context: Readonly<UserNotesArrayLoaderContext>;

  constructor(context: Readonly<UserNotesArrayLoaderContext>) {
    this.context = context;
  }

  private loader = new DataLoader<
    UserNotesArrayKey,
    ProjectionResult<NoteQueryType>,
    string
  >(
    async (keys) => {
      // Merge queries
      const mergedQuery = mergeProjections(
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
      const userNoteLookupInput = queryToNoteLookupInput(
        mergedQuery,
        this.context.models
      );

      const userNotesResults = await this.context.models.User.aggregate<
        UserNotesArrayLookupOutput<MongoAggregateUserNoteResult>
      >([
        {
          $match: {
            _id: this.context.userId,
          },
        },
        {
          $project: {
            order: `$${this.context.userNotesArrayPath}`,
          },
        },
        ...relayPaginateUserNotesArray({
          pagination: {
            arrayFieldPath: 'order',
            paginations: allPaginations,
          },
          userNotes: {
            userNoteCollctionName: this.context.models.UserNote.collection.collectionName,
            userNoteLookupInput,
          },
        }),
      ]);

      const userNotesResult = userNotesResults[0];
      if (!userNotesResult) {
        return Error(`Expected User aggregate to return data`);
      }

      ///userNotesResults[0]?.userNotes[0]?.note

      // Map paginations to original query
      // const noteByPublicId = mapRecordsPaginations(userNotesResult.userNotes, mergedQuery);

      // must map by input userNotes pagination...

      // return keys.map((key) => {
      //   const noteInfo = noteByPublicId[key.publicId];
      //   if (!noteInfo) {
      //     return new GraphQLError(`Note '${key.publicId}' not found`, {
      //       extensions: {
      //         code: GraphQLErrorCode.NotFound,
      //       },
      //     });
      //   }

      //   return getProjectionResult(noteInfo, key.query.note?.collabText);
      // });
    },
    {
      cacheKeyFn: getEqualObjectString,
    }
  );

  get(key: UserNotesArrayKey) {
    return this.loader.load(key);
  }
}

// specify userId "_id", path "notes.category.default.order" and pagination
