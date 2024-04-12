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
import {
  getPaginationKey,
  paginationStringToInt,
} from '../../../mongoose/operations/pagination/relayArrayPagination';
import { CollaborativeDocumentQueryType } from '../../collab/mongo-query-mapper/collaborative-document';
import { RevisionRecordQueryType } from '../../collab/mongo-query-mapper/revision-record';

import { GraphQLError } from 'graphql';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import mapObject, { mapObjectSkip } from 'map-obj';
import { PipelineStage } from 'mongoose';
import { GraphQLResolversContext } from '../../context';

import sortObject from '~utils/sortObject';

interface LoaderKey {
  publicId: string;
  query: Projection<NoteQueryType>;
}

type NotesLoaderContext = Pick<
  GraphQLResolversContext['mongoose']['model'],
  'UserNote' | 'CollabText' | 'Note'
>;

type RecordWithRevision = Record<
  string,
  (ProjectionResult<RevisionRecordQueryType> & {
    revision: number;
  })[]
>;

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

interface UserNoteCollabTextPaginationByKey {
  userNote: MongoAggregateUserNoteResult;
  collabTextRecordsByPagination: Record<NoteTextField, RecordWithRevision>;
}

interface MongoAggregateUserNoteInputData {
  lookupInput: UserNoteLookupInput<NoteTextField>;
  project: PipelineStage.Project['$project'];
}

function queryToMongoAggregateInputData(
  userNoteQuery: MergedProjection<NoteQueryType>,
  context: NotesLoaderContext
): MongoAggregateUserNoteInputData {
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
    lookupInput: {
      note: noteLookupInput,
      collabText: collabTextLookupInput,
    },
    project: {
      ...userNoteProject,
      ...(Object.keys(userNote_note_Project).length > 0
        ? { note: userNote_note_Project }
        : {}),
    },
  };
}

function mapCollabTextRecordsByPagination(
  collabTextQuery:
    | MergedProjection<Record<NoteTextField, CollaborativeDocumentQueryType>>
    | undefined,
  note: MongoAggregateUserNoteResult['note']
): Record<NoteTextField, RecordWithRevision> {
  if (!collabTextQuery) {
    return mapObject(NoteTextField, (_key, value) => [value, {}]);
  }

  return mapObject(collabTextQuery, (key, query) => {
    if (!query?.records?.$paginations) return mapObjectSkip;

    const paginationInput = query.records.$paginations.map(paginationStringToInt);
    const paginationOutput = note?.collabText?.[key as NoteTextField]?.records;
    if (!paginationOutput) {
      throw new Error('Expected pagination result');
    }

    assertRecordRevisionDefined(paginationOutput);
    const recordsGroupedByInput = mapRevisionRecordsPaginationInputToOutput(
      paginationInput,
      paginationOutput
    );
    const recordsByPaginationKey: Record<string, (typeof recordsGroupedByInput)[0]> = {};

    for (let i = 0; i < paginationInput.length; i++) {
      const pagination = paginationInput[i];
      if (!pagination) continue;
      const recordsByInput = recordsGroupedByInput[i];
      if (!recordsByInput) continue;

      recordsByPaginationKey[getPaginationKey(pagination)] = recordsByInput;
    }

    return [key, recordsByPaginationKey];
  });
}

function mapRecordsPaginations(
  userNotesResult: MongoAggregateUserNoteResult[],
  userNoteQuery: MergedProjection<NoteQueryType>
): Record<string, UserNoteCollabTextPaginationByKey> {
  return userNotesResult.reduce<Record<string, UserNoteCollabTextPaginationByKey>>(
    (retMap, userNote) => {
      const publicId = userNote.note?.publicId;
      if (!publicId) {
        throw new Error('Expected field note.publicId in UserNote response');
      }

      retMap[publicId] = {
        userNote,
        collabTextRecordsByPagination: mapCollabTextRecordsByPagination(
          userNoteQuery.note?.collabText,
          userNote.note
        ),
      };

      return retMap;
    },
    {}
  );
}

function getProjectionResult(
  noteInfo: UserNoteCollabTextPaginationByKey,
  collabTextQuery?: Projection<Record<NoteTextField, CollaborativeDocumentQueryType>>
): ProjectionResult<NoteQueryType> {
  return {
    ...noteInfo.userNote,
    note: {
      ...noteInfo.userNote.note,
      collabText: collabTextQuery
        ? mapObject(collabTextQuery, (collabKey, query) => {
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
                noteInfo.collabTextRecordsByPagination[collabKey as NoteTextField][pKey];
            }
            return [collabKey, { ...collabText, records }];
          })
        : undefined,
    },
  };
}

export default class NotesLoader {
  private context: Readonly<NotesLoaderContext>;

  constructor(context: Readonly<NotesLoaderContext>) {
    this.context = context;
  }

  private loader = new DataLoader<LoaderKey, ProjectionResult<NoteQueryType>, string>(
    async (keys) => {
      console.log(`Run loader with ${keys.length} keys`);
      // Gather publicIds
      const allPublicIds = keys.map(({ publicId }) => publicId);

      // Merge queries
      const mergedQuery = mergeProjections(
        {},
        keys.map(({ query }) => query)
      );

      // Build aggregate query
      const { lookupInput, project } = queryToMongoAggregateInputData(
        mergedQuery,
        this.context
      );

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
          ...userNoteLookup(lookupInput),
          {
            $project: project,
          },
        ]);

      // Map paginations to original query
      const noteByPublicId = mapRecordsPaginations(userNotesResult, mergedQuery);

      return keys.map((key) => {
        const noteInfo = noteByPublicId[key.publicId];
        if (!noteInfo) {
          return new GraphQLError(`Note '${key.publicId}' not found`, {
            extensions: {
              code: GraphQLErrorCode.NotFound,
            },
          });
        }

        return getProjectionResult(noteInfo, key.query.note?.collabText);
      });
    },
    {
      cacheKeyFn: (key) => {
        const sortedKey = sortObject(key);
        return JSON.stringify(sortedKey, null, undefined);
      },
    }
  );

  get(notePublicId: LoaderKey['publicId'], query: LoaderKey['query']) {
    return this.loader.load({
      publicId: notePublicId,
      query,
    });
  }
}
