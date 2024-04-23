import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  type MutationResolvers,
  ResolversTypes,
  NoteTextField,
} from '../../../types.generated';
import { RevisionRecords } from '~collab/records/revision-records';
import { addFiltersToRevisionRecords } from '~collab/records/record';
import {
  CollabTextSchema,
  RevisionRecordSchema,
} from '../../../../mongodb/schema/collabText/collab-text';
import { Changeset } from '~collab/changeset/changeset';

import areKeysDefined from '~utils/areKeysDefined';
import { AnyBulkWriteOperation } from 'mongodb';
import { CollectionName } from '../../../../mongodb/collections';
import {
  CollabTextQuery,
  CollabTextQueryMapper,
} from '../../../collab/mongo-query-mapper/collab-text';
import { CollabTextRecordQueryMapper } from '../../../collab/mongo-query-mapper/revision-record';
import { DeepQueryResponse, MongoDocumentQuery } from '../../../../mongodb/query-builder';
import { NoteQuery } from '../../mongo-query-mapper/note';
import { publishNoteUpdated } from '../Subscription/noteUpdated';
import { CollabTextMapper } from '../../../collab/schema.mappers';
import isEmptyDeep from '~utils/isEmptyDeep';

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

              // Get relevant records for changeset follow and headText
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

              const {
                _id: collabTextId,
                headText,
                records: existingRecords,
              } = parseAndValidateCollabTextForRecordInsertion(
                userNote,
                fieldName,
                notePublicId
              );

              if (headText.revision < insertRecord.change.revision) {
                throw new GraphQLError(
                  `Invalid revision. Expected note '${fieldName}' field revision ${insertRecord.change.revision} to be before or same as HEAD revision ${headText.revision}`,
                  {
                    extensions: {
                      code: GraphQLErrorCode.InvalidInput,
                    },
                  }
                );
              }

              const firstRecord = existingRecords[0];
              if (
                firstRecord != null &&
                insertRecord.change.revision < firstRecord.revision - 1
              ) {
                throw new GraphQLError(
                  `Revision is too old. Expected note '${fieldName}' field revision ${
                    insertRecord.change.revision
                  } to be after TAIL revision ${firstRecord.revision - 1}`,
                  {
                    extensions: {
                      code: GraphQLErrorCode.InvalidInput,
                    },
                  }
                );
              }

              // Process record, following any future records
              const insertion = processInsertRecord(existingRecords, {
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
                          _id: collabTextId,
                        };
                      },
                    },
                  });
                },
              };

              // Build payloads
              responseTextFieldsPayload.push({
                key: fieldName,
                value: {
                  newRecord: new CollabTextRecordQueryMapper(
                    collabTextIdMapper,
                    !insertion.isExisting
                      ? {
                          queryDocument() {
                            return insertion.processedRecord;
                          },
                        }
                      : {
                          async queryDocument(query) {
                            if (
                              query.creatorUserId != null ||
                              query.afterSelection != null ||
                              query.beforeSelection != null
                            ) {
                              // Cannot use session here since query happens outside from withSession
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
                                                insertion.processedRecord.revision - 1,
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
                                ...insertion.processedRecord,
                              };
                            }

                            return insertion.processedRecord;
                          },
                        }
                  ),
                  isExistingRecord: insertion.isExisting,
                },
              });

              if (!insertion.isExisting) {
                // New record, create bulkUpdate query

                let newHeadText: Changeset;
                try {
                  newHeadText = headText.changeset.compose(
                    insertion.processedRecord.changeset
                  );
                } catch (err) {
                  if (err instanceof Error) {
                    throw new GraphQLError(
                      'Invalid changeset. Cannot compose it on HEAD.',
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

                const bulkUpdate: AnyBulkWriteOperation<CollabTextSchema> = {
                  updateOne: {
                    filter: {
                      _id: collabTextId,
                    },
                    update: {
                      $set: {
                        headText: {
                          revision: insertion.processedRecord.revision,
                          changeset: newHeadText.serialize(),
                        },
                      },
                      $push: {
                        records: {
                          ...insertion.processedRecord,
                          changeset: insertion.processedRecord.changeset.serialize(),
                        },
                      },
                    },
                  },
                };

                publishTextFieldsPayload.push({
                  key: fieldName,
                  value: {
                    newRecord: new CollabTextRecordQueryMapper(collabTextIdMapper, {
                      queryDocument() {
                        return insertion.processedRecord;
                      },
                    }),
                    isExistingRecord: false,
                  },
                });

                return bulkUpdate;
              }

              return;
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

      const payloads: {
        response: UpdateNotePayload;
        publish: NoteUpdatedPayload | null;
      } = {
        response: {
          contentId: notePublicId,
          patch: {
            textFields: responseTextFieldsPayload,
            preferences: preferencesPayload,
          },
        },
        publish: haveNothingToPublish
          ? null
          : {
              contentId: notePublicId,
              patch: {
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

function processInsertRecord<
  TRecord extends Pick<
    RevisionRecordSchema<Changeset>,
    'userGeneratedId' | 'revision' | 'changeset'
  >,
  TInsertRecord extends RevisionRecordSchema<Changeset> & TRecord,
>(
  existingRecords: TRecord[],
  insertRecord: TInsertRecord
): ReturnType<RevisionRecords<TRecord, TInsertRecord>['insert']> {
  if (existingRecords.length === 0) {
    return {
      isExisting: false,
      processedRecord: {
        ...insertRecord,
        revision: insertRecord.revision + 1,
      },
    };
  }

  const revisionRecords = new RevisionRecords<TRecord, TInsertRecord>({
    records: existingRecords,
  });
  addFiltersToRevisionRecords(revisionRecords);
  return revisionRecords.insert(insertRecord);
}

function parseAndValidateCollabTextForRecordInsertion(
  userNote: DeepQueryResponse<NoteQuery>,
  fieldName: NoteTextField,
  notePublicId: string
) {
  const collabText = userNote.note?.collabTexts?.[fieldName];
  if (!collabText) {
    throw new Error(
      `Missing CollabText document for note '${notePublicId}' field '${fieldName}'`
    );
  }

  const collabTextId = collabText._id;
  if (!collabTextId) {
    throw new Error(`Note '${notePublicId}' field '${fieldName}' missing _id`);
  }

  const rawHeadText = collabText.headText?.changeset;
  if (!rawHeadText) {
    throw new Error(
      `Note '${notePublicId}' field '${fieldName}' missing headText changeset`
    );
  }

  const headRevision = collabText.headText.revision;
  if (headRevision == null) {
    throw new Error(`Note '${notePublicId}' field '${fieldName}' missing reviision`);
  }

  const rawRecords = collabText.records;
  if (!rawRecords) {
    throw new Error(`Note '${notePublicId}' field '${fieldName}' missing records array`);
  }

  return {
    collabText,
    _id: collabTextId,
    headText: {
      changeset: Changeset.parseValue(rawHeadText),
      revision: headRevision,
    },
    records: rawRecords.map((record) => {
      if (!areKeysDefined(record, ['userGeneratedId', 'revision', 'changeset'])) {
        throw new Error(
          `Record missing one of required keys: ${String([
            'userGeneratedId',
            'revision',
            'changeset',
          ])}. Existing keys: ${String(Object.keys(record))}.`
        );
      }

      return {
        ...record,
        changeset: Changeset.parseValue(record.changeset),
      };
    }),
  };
}

function isDefined<T>(obj: T): obj is Exclude<T, undefined | null> {
  return obj != null;
}
