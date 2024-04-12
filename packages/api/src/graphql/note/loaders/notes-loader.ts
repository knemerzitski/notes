import DataLoader from 'dataloader';
import {
  MergedProjection,
  Projection,
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
import { MongooseModels } from '../../../mongoose/models';
import {
  getPaginationKey,
  paginationStringToInt,
} from '../../../mongoose/operations/pagination/relayArrayPagination';
import { CollaborativeDocumentQueryType } from '../../collab/mongo-query-mapper/collaborative-document';
import { RevisionRecordQueryType } from '../../collab/mongo-query-mapper/revision-record';

import util from 'util';
import { GraphQLError } from 'graphql';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import mapObject, { mapObjectSkip } from 'map-obj';

interface LoaderKey {
  publicId: string;
  query: Projection<NoteQueryType>;
}

interface NotesLoaderContext {
  models: Pick<MongooseModels, 'UserNote' | 'CollabText' | 'Note'>;
}

type RecordWithRevision = Record<
  string,
  (ProjectionResult<RevisionRecordQueryType> & {
    revision: number;
  })[]
>;

type UserNoteAggregate = ProjectionResult<Omit<NoteQueryType, 'note'>> & {
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
interface UserNoteCollabTextPaginationByKey {
  userNote: UserNoteAggregate;
  collabTextRecordsByPagination: Record<NoteTextField, RecordWithRevision>;
}

export default class NotesLoader {
  private context: Readonly<NotesLoaderContext>;

  constructor(context: Readonly<NotesLoaderContext>) {
    this.context = context;
  }

  private loader = new DataLoader<LoaderKey, ProjectionResult<NoteQueryType>>(
    async (keys) => {
      const allPublicIds = keys.map(({ publicId }) => publicId);

      const userNoteQuery = mergeProjections(
        {},
        keys.map(({ query }) => query)
      );

      const { note: userNote_noteQuery, ...queryNoNote } = userNoteQuery;

      const userNote_noteProject: Record<string, unknown> = {
        publicId: 1,
      };
      const userNoteProject: MergedProjection<NoteQueryType> = { ...queryNoNote };
      if (!userNoteProject._id) {
        userNoteProject._id = 0;
      }
      let noteLookupInput: UserNoteLookupInput<NoteTextField>['note'] | undefined =
        undefined;
      let collabTextLookupInput:
        | UserNoteLookupInput<NoteTextField>['collabText']
        | undefined = undefined;
      if (userNote_noteQuery) {
        const { id, collabText, ...noteProject } = userNote_noteQuery;

        if (id) {
          userNote_noteProject.id = 1;
        }

        if (Object.keys(noteProject).length > 0) {
          noteLookupInput = {
            collectionName: this.context.models.Note.collection.collectionName,
            pipeline: [{ $project: noteProject }],
          };
          Object.assign(userNote_noteProject, noteProject);
        }

        if (collabText) {
          collabTextLookupInput = {
            collectionName: this.context.models.CollabText.collection.collectionName,
            keys: mapObject(collabText, (key, query) => {
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
          userNote_noteProject.collabText = 1;
        }
      }

      const aggregatePipeline = [
        {
          $match: {
            'note.publicId': {
              $in: allPublicIds,
            },
          },
        },
        ...userNoteLookup({
          note: noteLookupInput,
          collabText: collabTextLookupInput,
        }),
        {
          $project: {
            ...userNoteProject,
            ...(Object.keys(userNote_noteProject).length > 0
              ? { note: userNote_noteProject }
              : {}),
          },
        },
      ];

      // console.log(util.inspect({ aggregatePipeline }, false, null, true));

      // TODO results value not optional, all should be???
      const userNotesResult =
        await this.context.models.UserNote.aggregate<UserNoteAggregate>(
          aggregatePipeline,
          {
            ignoreUndefined: true,
          }
        );

      // console.log(util.inspect({ userNotesResult }, false, null, true));

      const noteByPublicId = userNotesResult.reduce<
        Record<string, UserNoteCollabTextPaginationByKey>
      >((retMap, userNote) => {
        const publicId = userNote.note?.publicId;
        if (!publicId) {
          throw new Error('Expected field note.publicId in UserNote response');
        }

        retMap[publicId] = {
          userNote,
          collabTextRecordsByPagination: userNoteQuery.note?.collabText
            ? mapObject(userNoteQuery.note.collabText, (key, query) => {
                if (!query?.records?.$paginations) return mapObjectSkip;

                const paginationInput =
                  query.records.$paginations.map(paginationStringToInt);
                const paginationOutput =
                  userNote.note?.collabText?.[key as NoteTextField]?.records;
                if (!paginationOutput) {
                  throw new Error('Expected pagination result');
                }

                // TODO assert array is never undefined!

                assertRecordRevisionDefined(paginationOutput);
                const recordsGroupedByInput = mapRevisionRecordsPaginationInputToOutput(
                  paginationInput,
                  paginationOutput
                );
                const recordsByPaginationKey: Record<
                  string,
                  (typeof recordsGroupedByInput)[0]
                > = {};

                for (let i = 0; i < paginationInput.length; i++) {
                  const pagination = paginationInput[i];
                  if (!pagination) continue;
                  const recordsByInput = recordsGroupedByInput[i];
                  if (!recordsByInput) continue;

                  recordsByPaginationKey[getPaginationKey(pagination)] = recordsByInput;
                }

                return [key, recordsByPaginationKey];
              })
            : mapObject(NoteTextField, (_key, value) => [value, {}]),
        };

        return retMap;
      }, {});

      // console.log(util.inspect({ noteByPublicId }, false, null, true));

      return keys.map((key) => {
        const noteInfo = noteByPublicId[key.publicId];
        if (!noteInfo) {
          return new GraphQLError(`Note '${key.publicId}' not found`, {
            extensions: {
              code: GraphQLErrorCode.NotFound,
            },
          });
        }

        return {
          ...noteInfo.userNote,
          note: {
            ...noteInfo.userNote.note,
            collabText: key.query.note?.collabText
              ? mapObject(key.query.note.collabText, (collabKey, query) => {
                  if (!query) return mapObjectSkip;

                  const collabText =
                    noteInfo.userNote.note?.collabText?.[collabKey as NoteTextField];
                  let records:
                    | (ProjectionResult<RevisionRecordQueryType> & {
                        revision: number;
                      })[]
                    | undefined;
                  if (query.records?.$pagination) {
                    const pKey = getPaginationKey(query.records.$pagination);
                    records =
                      noteInfo.collabTextRecordsByPagination[collabKey as NoteTextField][
                        pKey
                      ];
                  }
                  return [collabKey, { ...collabText, records }];
                })
              : undefined,
          },
        };
      });
    }
  );

  get(notePublicId: LoaderKey['publicId'], query: LoaderKey['query']) {
    return this.loader.load({
      publicId: notePublicId,
      query,
    });
  }
}
