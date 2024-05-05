import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  type MutationResolvers,
  ResolversTypes,
  NoteTextField,
} from '../../../types.generated';
import { CollabTextSchema } from '../../../../mongodb/schema/collab-text';

import { AnyBulkWriteOperation } from 'mongodb';
import { CollectionName } from '../../../../mongodb/collections';
import {
  CollabTextQuery,
  CollabTextQueryMapper,
} from '../../../collab/mongo-query-mapper/collab-text';
import { CollabTextRecordQueryMapper } from '../../../collab/mongo-query-mapper/revision-record';
import { DeepQueryResponse, MongoDocumentQuery } from '../../../../mongodb/query-builder';
import { publishNoteUpdated } from '../Subscription/noteUpdated';
import { CollabTextMapper } from '../../../collab/schema.mappers';
import isEmptyDeep from '~utils/object/isEmptyDeep';
import isDefined from '~utils/type-guards/isDefined';
import recordInsertion, { RecordInsertionError } from '~collab/records/recordInsertion';
import { NoteQuery } from '../../mongo-query-mapper/note';
import { NoteMapper } from '../../schema.mappers';

type DefinedAwaited<T> = NonNullable<Awaited<T>>;

type Payload = DefinedAwaited<
  ResolversTypes['UpdateNotePayload'] & ResolversTypes['NoteUpdatedPayload']
>;
type UpdateNotePayload = DefinedAwaited<ResolversTypes['UpdateNotePayload']>;
type NoteUpdatedPayload = DefinedAwaited<ResolversTypes['NoteUpdatedPayload']>;

type PayloadPatch = DefinedAwaited<Payload['patch']>;
type UpdateNotePayloadPatch = DefinedAwaited<UpdateNotePayload['patch']>;
type NoteUpdatedPayloadPatch = DefinedAwaited<NoteUpdatedPayload['patch']>;

export const updateNote: NonNullable<MutationResolvers['updateNote']> = async (
  _parent,
  { input: { contentId: notePublicId, patch } },
  ctx
) => {
  const { auth, mongodb, datasources } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const userNote = await datasources.notes.getNote({
    userId: currentUserId,
    publicId: notePublicId,
    noteQuery: {
      _id: 1,
      readOnly: 1,
    },
  });

  const userNoteId = userNote._id;
  const isReadOnly = userNote.readOnly ?? false;

  if (!userNoteId) {
    throw new Error(
      `Expected user '${String(
        currentUserId
      )} to have UserNote._id for note with contentId '${notePublicId}'`
    );
  }

  if (!patch || isEmptyDeep(patch)) {
    return {
      contentId: notePublicId,
    };
  }

  if (isReadOnly && patch.textFields && patch.textFields.length > 0) {
    throw new GraphQLError(`Note is read-only and it's contents cannot be modified.`, {
      extensions: {
        code: GraphQLErrorCode.ReadOnly,
      },
    });
  }

  const payloads = await mongodb.client.withSession((session) =>
    session.withTransaction(async (session) => {
      const responseTextFieldsPayload: UpdateNotePayloadPatch['textFields'] = [];
      const publishTextFieldsPayload: NoteUpdatedPayloadPatch['textFields'] = [];
      const preferencesPayload: PayloadPatch['preferences'] = {};
      const updateDbPromises: Promise<unknown>[] = [];
      if (patch.textFields) {
        updateDbPromises.push(
          Promise.all(
            patch.textFields.map(async ({ key: fieldName, value: { insertRecord } }) => {
              if (!insertRecord) return;

              // Get relevant records for record insertion
              const userNote = await datasources.notes.getNote(
                {
                  publicId: notePublicId,
                  userId: currentUserId,
                  noteQuery: {
                    note: {
                      collabTexts: {
                        [fieldName]: {
                          _id: 1,
                          headText: {
                            changeset: 1,
                            revision: 1,
                          },
                          records: {
                            $query: {
                              userGeneratedId: 1,
                              revision: 1,
                              changeset: 1,
                            },
                            $pagination: {
                              after: insertRecord.change.revision,
                            },
                          },
                        },
                      },
                    },
                  },
                },
                {
                  session,
                }
              );

              const collabText = assertCollabTextWithId(
                userNote,
                fieldName,
                notePublicId
              );

              try {
                // Process record, following any future records
                const insertion = recordInsertion({
                  serializedHeadText: collabText.headText?.changeset,
                  headRevision: collabText.headText?.revision,
                  serializedRecords: collabText.records,
                  insertRecord: {
                    userGeneratedId: insertRecord.generatedId,
                    revision: insertRecord.change.revision,
                    changeset: insertRecord.change.changeset,
                    creatorUserId: currentUserId,
                    afterSelection: {
                      start: insertRecord.afterSelection.start,
                      ...(insertRecord.afterSelection.end != null
                        ? { end: insertRecord.afterSelection.end }
                        : {}),
                    },
                    beforeSelection: {
                      start: insertRecord.beforeSelection.start,
                      ...(insertRecord.beforeSelection.end != null
                        ? { end: insertRecord.beforeSelection.end }
                        : {}),
                    },
                  },
                });

                const collabTextIdMapper: Pick<CollabTextMapper, 'id'> = {
                  id() {
                    return CollabTextQueryMapper.prototype.id.call<
                      {
                        query: MongoDocumentQuery<Pick<CollabTextQuery, '_id'>>;
                      },
                      [],
                      Promise<string | undefined>
                    >({
                      query: {
                        queryDocument() {
                          return {
                            _id: collabText._id,
                          };
                        },
                      },
                    });
                  },
                };

                // Response payload
                responseTextFieldsPayload.push({
                  key: fieldName,
                  value: {
                    id: () => collabTextIdMapper.id(),
                    newRecord: new CollabTextRecordQueryMapper(
                      collabTextIdMapper,
                      !insertion.isExisting
                        ? {
                            queryDocument() {
                              return insertion.newRecord;
                            },
                          }
                        : {
                            async queryDocument(query) {
                              if (
                                query.creatorUserId != null ||
                                query.afterSelection != null ||
                                query.beforeSelection != null
                              ) {
                                // Cannot use session here since query happens outside withSession after this field resolver has returned
                                const missingRecordValues = (
                                  await datasources.notes.getNote({
                                    publicId: notePublicId,
                                    userId: currentUserId,
                                    noteQuery: {
                                      note: {
                                        collabTexts: {
                                          [fieldName]: {
                                            records: {
                                              $query: query,
                                              $pagination: {
                                                after:
                                                  insertion.existingRecord.revision - 1,
                                                first: 1,
                                              },
                                            },
                                          },
                                        },
                                      },
                                    },
                                  })
                                ).note?.collabTexts?.[fieldName]?.records?.[0];

                                return {
                                  ...missingRecordValues,
                                  ...insertion.existingRecord,
                                };
                              }

                              return insertion.existingRecord;
                            },
                          }
                    ),
                    isExistingRecord: insertion.isExisting,
                  },
                });

                if (!insertion.isExisting) {
                  // New record, create bulkUpdate query
                  const bulkUpdate: AnyBulkWriteOperation<CollabTextSchema> = {
                    updateOne: {
                      filter: {
                        _id: collabText._id,
                      },
                      update: {
                        $set: {
                          headText: {
                            revision: insertion.newHeadText.revision,
                            changeset: insertion.newHeadText.changeset.serialize(),
                          },
                        },
                        $push: {
                          records: {
                            ...insertion.newRecord,
                            changeset: insertion.newRecord.changeset.serialize(),
                          },
                        },
                      },
                    },
                  };

                  // Publish payload
                  publishTextFieldsPayload.push({
                    key: fieldName,
                    value: {
                      id: () => collabTextIdMapper.id(),
                      newRecord: new CollabTextRecordQueryMapper(collabTextIdMapper, {
                        queryDocument() {
                          return insertion.newRecord;
                        },
                      }),
                      isExistingRecord: false,
                    },
                  });

                  return bulkUpdate;
                }

                return;
              } catch (err) {
                if (err instanceof RecordInsertionError) {
                  throw new GraphQLError(
                    `Note '${notePublicId}' field ${fieldName}. ${err.message}`,
                    {
                      extensions: {
                        code: GraphQLErrorCode.InvalidInput,
                      },
                    }
                  );
                } else {
                  throw err;
                }
              }
            })
          ).then(async (maybeRecordUpdates) => {
            const recordUpdates = maybeRecordUpdates.filter(isDefined);

            if (recordUpdates.length > 0) {
              await mongodb.collections[CollectionName.CollabTexts].bulkWrite(
                recordUpdates,
                {
                  session,
                }
              );
            }
          })
        );
      }

      if (patch.preferences?.backgroundColor) {
        updateDbPromises.push(
          mongodb.collections[CollectionName.UserNotes].updateOne(
            {
              _id: userNoteId,
            },
            {
              $set: {
                preferences: {
                  backgroundColor: patch.preferences.backgroundColor,
                },
              },
            },
            {
              session,
            }
          )
        );
        preferencesPayload.backgroundColor = patch.preferences.backgroundColor;
      }

      await Promise.all(updateDbPromises);

      const haveNothingToPublish =
        publishTextFieldsPayload.length === 0 && isEmptyDeep(preferencesPayload);

      const userNoteIdMapper: Pick<NoteMapper, 'id'> = {
        id() {
          return CollabTextQueryMapper.prototype.id.call<
            {
              query: MongoDocumentQuery<Pick<NoteQuery, '_id'>>;
            },
            [],
            Promise<string | undefined>
          >({
            query: {
              queryDocument() {
                return {
                  _id: userNoteId,
                };
              },
            },
          });
        },
      };

      const payloads: {
        response: UpdateNotePayload;
        publish: NoteUpdatedPayload | null;
      } = {
        response: {
          contentId: notePublicId,
          patch: {
            id: () => userNoteIdMapper.id(),
            textFields: responseTextFieldsPayload,
            preferences: preferencesPayload,
          },
        },
        publish: haveNothingToPublish
          ? null
          : {
              contentId: notePublicId,
              patch: {
                id: () => userNoteIdMapper.id(),
                textFields: publishTextFieldsPayload,
                preferences: preferencesPayload,
              },
            },
      };

      return payloads;
    })
  );

  if (payloads.publish !== null) {
    await publishNoteUpdated(ctx, payloads.publish);
  }

  return payloads.response;
};

function assertCollabTextWithId(
  userNote: DeepQueryResponse<NoteQuery>,
  fieldName: NoteTextField,
  notePublicId: string
) {
  const collabText = userNote.note?.collabTexts?.[fieldName];
  if (!collabText) {
    throw new Error(
      `Expected CollabText document for note '${notePublicId}' '${fieldName}' field`
    );
  }

  const collabTextId = collabText._id;
  if (!collabTextId) {
    throw new Error(
      `Expected CollabText._id for note '${notePublicId}' '${fieldName}' field`
    );
  }

  return {
    ...collabText,
    _id: collabTextId,
  };
}
