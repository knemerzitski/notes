import DataLoader from 'dataloader';
import {
  MergedDeepQuery,
  DeepQuery,
  DeepQueryResponsePaginationMapped,
  DeepQueryResponse,
  mergeQueries,
} from '../../../mongoose/query-builder';
import { NoteQueryType } from '../mongo-query-mapper/note';
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
import relayPaginateUserNotesArray, {
  RelayPaginateUserNotesArrayOuput,
} from '../../../mongoose/operations/pagination/relayPaginateUserNotesArray';

import { multiRelayArrayPaginationMapOutputToInput } from '../../../mongoose/operations/pagination/relayMultiArrayPaginationConcat';
import { NoteTextField } from '../../types.generated';

export interface NoteKey {
  /**
   * User who has a UserNote document.
   */
  userId: ObjectId;
  /**
   * publicId of Note.
   */
  publicId: string;
  /**
   * Fields to retrieve, inclusion projection.
   */
  noteQuery: DeepQuery<NoteQueryType>;
}

export interface NoteConnectionKey {
  /**
   * User who has array of UserNotes in User document.
   */
  userId: ObjectId;
  /**
   * Path to array field with UserNote._id in User document.
   */
  userNotesArrayPath: string;
  /**
   * Array pagination
   */
  pagination: RelayPagination<ObjectId>;
  /**
   * Fields to retrieve, inclusion projection.
   */
  noteQuery: DeepQuery<NoteQueryType>;
}

export interface NotesDataSourceContext {
  mongoose: {
    models: Pick<
      GraphQLResolversContext['mongoose']['model'],
      'User' | 'UserNote' | 'CollabText' | 'Note'
    >;
  };
}

export interface NoteBatchLoadContext {
  mongoose: {
    models: Pick<
      NotesDataSourceContext['mongoose']['models'],
      'UserNote' | 'Note' | 'CollabText'
    >;
  };
}
export interface NoteConnectionBatchLoadContext {
  mongoose: {
    models: Pick<
      NotesDataSourceContext['mongoose']['models'],
      'User' | 'UserNote' | 'Note' | 'CollabText'
    >;
  };
}

type UserNoteDeepQueryResponse<TCollabTextKey extends string = NoteTextField> =
  DeepQueryResponse<Omit<NoteQueryType<TCollabTextKey>, 'note'>> & {
    note?: DeepQueryResponse<
      Omit<NoteQueryType<TCollabTextKey>['note'], 'collabText'>
    > & {
      collabText?: Record<
        TCollabTextKey,
        DeepQueryResponse<Omit<CollaborativeDocumentQueryType, 'records'>> & {
          records?: CollabTextRevisionRecordsPaginationOutput<
            DeepQueryResponse<RevisionRecordQueryType>
          >;
        }
      >;
    };
  };

export default class NotesDataSource {
  private loaders: {
    note: DataLoader<NoteKey, DeepQueryResponse<NoteQueryType>, string>;
    noteConnection: DataLoader<
      NoteConnectionKey,
      DeepQueryResponse<NoteQueryType>[],
      string
    >;
  };

  constructor(context: Readonly<NotesDataSourceContext>) {
    this.loaders = {
      note: new DataLoader<NoteKey, DeepQueryResponse<NoteQueryType>, string>(
        async (keys) => noteBatchLoad(keys, context),
        {
          cacheKeyFn: getEqualObjectString,
        }
      ),
      noteConnection: new DataLoader<
        NoteConnectionKey,
        DeepQueryResponse<NoteQueryType>[],
        string
      >((keys) => noteConnectionBatchLoad(keys, context), {
        cacheKeyFn: getEqualObjectString,
      }),
    };
  }

  getNote(key: NoteKey) {
    return this.loaders.note.load(key);
  }

  async getNoteConnection(key: NoteConnectionKey) {
    const userNotes = await this.loaders.noteConnection.load(key);

    // Add notes found in notesConnection to note loader
    userNotes.forEach((userNote) => {
      const publicId = userNote.note?.publicId;
      if (!publicId) return;

      this.loaders.note.prime(
        {
          userId: key.userId,
          publicId,
          noteQuery: key.noteQuery,
        },
        userNote
      );
    });

    return userNotes;
  }
}

async function noteBatchLoad(
  keys: Readonly<NoteKey[]>,
  context: Readonly<NoteBatchLoadContext>
): Promise<(DeepQueryResponse<NoteQueryType> | Error)[]> {
  const keysByUserId = groupByUserId(keys);

  const userNotesBy_userId_publicId = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByUserId).map(async ([userIdStr, sameUserKeys]) => {
        const userId = ObjectId.createFromHexString(userIdStr);

        // Gather publicIds
        const allPublicIds = sameUserKeys.map(({ publicId }) => publicId);

        // Merge queries
        const mergedQuery = mergeQueries(
          {},
          sameUserKeys.map(({ noteQuery }) => noteQuery)
        );

        // Build aggregate query
        const userNoteLookupInput = userNoteQueryToLookupInput(mergedQuery, context);

        // Fetch data
        const userNotesResult =
          await context.mongoose.models.UserNote.aggregate<UserNoteDeepQueryResponse>([
            {
              $match: {
                userId,
                'note.publicId': {
                  $in: allPublicIds,
                },
              },
            },
            ...userNoteLookup(userNoteLookupInput),
          ]);

        // Map paginations to original query
        const userNotesBy_publicId = userNotesResult.reduce<
          Record<string, DeepQueryResponsePaginationMapped<NoteQueryType>>
        >((retMap, userNote) => {
          const publicId = userNote.note?.publicId;
          if (!publicId) {
            throw new Error('Expected field note.publicId in UserNote response');
          }

          retMap[publicId] = userNoteResponseToPaginationsMapped(userNote, mergedQuery);

          return retMap;
        }, {});

        return [userIdStr, userNotesBy_publicId];
      })
    )
  ) as Record<string, Record<string, DeepQueryResponsePaginationMapped<NoteQueryType>>>;

  return keys.map((key) => {
    const userNote = userNotesBy_userId_publicId[key.userId.toString()]?.[key.publicId];
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

async function noteConnectionBatchLoad(
  keys: Readonly<NoteConnectionKey[]>,
  context: Readonly<NoteConnectionBatchLoadContext>
): Promise<(DeepQueryResponse<NoteQueryType>[] | Error)[]> {
  const keysByUserId = groupByUserId(keys);

  const userNotesBy_userId_arrayPath_paginationKey = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByUserId).map(async ([userIdStr, sameUserKeys]) => {
        const userId = ObjectId.createFromHexString(userIdStr);

        // Merge queries
        const mergedQuery = mergeQueries(
          {},
          sameUserKeys.map(({ noteQuery }) => noteQuery)
        );

        const allPaginationsByArrayPath = sameUserKeys.reduce<
          Record<string, { paginations: RelayPagination<ObjectId>[] }>
        >((map, { pagination, userNotesArrayPath }) => {
          const existing = map[userNotesArrayPath];
          if (existing) {
            existing.paginations.push(pagination);
          } else {
            map[userNotesArrayPath] = { paginations: [pagination] };
          }
          return map;
        }, {});

        // Build userNote aggregate query
        const userNoteLookupInput = userNoteQueryToLookupInput(mergedQuery, context);

        const userNotesResults = await context.mongoose.models.User.aggregate<
          RelayPaginateUserNotesArrayOuput<UserNoteDeepQueryResponse>
        >([
          {
            $match: {
              _id: userId,
            },
          },
          ...relayPaginateUserNotesArray({
            pagination: allPaginationsByArrayPath,
            userNotes: {
              userNoteCollctionName:
                context.mongoose.models.UserNote.collection.collectionName,
              userNoteLookupInput,
            },
          }),
        ]);

        const userNotesResult = userNotesResults[0];
        if (!userNotesResult) {
          throw new Error(`Expected User aggregate to return data`);
        }

        const userNotesByQueryPaginations = multiRelayArrayPaginationMapOutputToInput(
          mapObject(allPaginationsByArrayPath, (path, { paginations }) => [
            path,
            paginations,
          ]),
          userNotesResult.userNotes
        );

        const userNotesBy_arrayPath_paginationKey = mapObject(
          allPaginationsByArrayPath,
          (path, allPaginations) => {
            const mappedPaginations = userNotesByQueryPaginations[path];
            if (!mappedPaginations) {
              throw new Error(`Notes not found for path ${path}`);
            }

            const userNotesByPaginationKey: Record<string, UserNoteDeepQueryResponse[]> =
              {};
            for (let i = 0; i < allPaginations.paginations.length; i++) {
              const pagination = allPaginations.paginations[i];
              if (!pagination) continue;
              const userNotes = mappedPaginations[i];
              if (!userNotes) continue;

              userNotesByPaginationKey[getPaginationKey(pagination)] = userNotes;
            }

            return [path, userNotesByPaginationKey];
          }
        );

        return [userIdStr, userNotesBy_arrayPath_paginationKey];
      })
    )
  ) as Record<string, Record<string, Record<string, UserNoteDeepQueryResponse[]>>>;

  return keys.map((key) => {
    const userNotes =
      userNotesBy_userId_arrayPath_paginationKey[key.userId.toString()]?.[
        key.userNotesArrayPath
      ]?.[getPaginationKey(key.pagination)];
    if (!userNotes) {
      throw new Error(
        `Notes not found for pagination ${getPaginationKey(key.pagination)}`
      );
    }

    const userNotesPaginationsMapped = userNotes.map((userNote) =>
      userNoteResponseToPaginationsMapped(userNote, mergeQueries({}, [key.noteQuery]))
    );

    return userNotesPaginationsMapped.map((userNote) =>
      userNoteQueryPaginationMappedToResponse(userNote, key.noteQuery)
    );
  });
}

/**
 * Groups objects by "userId" ObjectId value.
 */
function groupByUserId<T extends { userId: ObjectId }>(keys: Readonly<T[]>) {
  return keys.reduce<Record<string, Readonly<T>[]>>((map, key) => {
    const userIdStr = key.userId.toString();
    const existing = map[userIdStr];
    if (existing) {
      existing.push(key);
    } else {
      map[userIdStr] = [key];
    }
    return map;
  }, {});
}

function userNoteQueryToLookupInput(
  userNoteQuery: MergedDeepQuery<NoteQueryType>,
  context: {
    mongoose: {
      models: Pick<NoteBatchLoadContext['mongoose']['models'], 'Note' | 'CollabText'>;
    };
  }
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
        collectionName: context.mongoose.models.Note.collection.collectionName,
        pipeline: [{ $project: noteProject }],
      };
      Object.assign(userNote_note_Project, noteProject);
    }

    if (collabText) {
      collabTextLookupInput = {
        collectionName: context.mongoose.models.CollabText.collection.collectionName,
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

function isKeyValuePrimitive(value: object) {
  const isPrimitive = value instanceof ObjectId;
  return !isPrimitive;
}

/**
 * Given two objects A and B with same contents, but A !== B => getEqualObjectString(A) === getEqualObjectString(B)
 * ObjectIds are considered primitive {@link isKeyValuePrimitive}.
 */
function getEqualObjectString(obj: unknown) {
  return JSON.stringify(sortObject(obj, isKeyValuePrimitive), null, undefined);
}
