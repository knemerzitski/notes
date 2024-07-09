import { GraphQLError } from 'graphql';
import { AnyBulkWriteOperation, UpdateFilter } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { SelectionRange } from '~collab/client/selection-range';
import { ChangesetRevisionRecords } from '~collab/records/changeset-revision-records';
import { RevisionChangeset, SerializedRevisionChangeset } from '~collab/records/record';
import recordInsertion, { RecordInsertionError } from '~collab/records/recordInsertion';
import { RevisionRecords } from '~collab/records/revision-records';
import { ErrorWithData } from '~utils/logger';
import isEmptyDeep from '~utils/object/isEmptyDeep';
import isDefined from '~utils/type-guards/isDefined';

import { CollectionName } from '../../../../mongodb/collections';
import { DeepQueryResponse, MongoDocumentQuery } from '../../../../mongodb/query-builder';
import { CollabTextSchema } from '../../../../mongodb/schema/collab-text';
import { getNotesArrayPath, UserSchema } from '../../../../mongodb/schema/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  CollabTextQuery,
  CollabTextQueryMapper,
} from '../../../collab/mongo-query-mapper/collab-text';
import { CollabTextRecordQueryMapper } from '../../../collab/mongo-query-mapper/revision-record';
import { CollabTextMapper } from '../../../collab/schema.mappers';
import {
  type MutationResolvers,
  ResolversTypes,
  NoteTextField,
  NoteCategory,
} from '../../../types.generated';
import { NoteQuery } from '../../mongo-query-mapper/note';
import { NoteMapper } from '../../schema.mappers';
import { publishNoteUpdated } from '../Subscription/noteUpdated';

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
      note: {
        ownerId: 1,
      },
      category: {
        name: 1,
      },
    },
  });

  const userNoteId = userNote._id;
  const isReadOnly = userNote.readOnly ?? false;
  const existingCategoryName = userNote.category?.name ?? NoteCategory.DEFAULT;

  if (!userNoteId) {
    throw new GraphQLError(`Note '${notePublicId}' not found`, {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
      },
    });
  }

  const ownerId = userNote.note?.ownerId;
  if (!ownerId) {
    throw new ErrorWithData(`Expected UserNote.note.ownerId to be defined`, {
      userId: currentUserId,
      notePublicId,
      userNote,
    });
  }

  if (!patch || isEmptyDeep(patch)) {
    return {
      contentId: notePublicId,
    };
  }

  if (isReadOnly && patch.textFields && patch.textFields.length > 0) {
    throw new GraphQLError(`Note is read-only and it's contents cannot be modified.`, {
      extensions: {
        code: GraphQLErrorCode.READ_ONLY,
      },
    });
  }

  const maxRecordsCount = ctx.options?.collabText?.maxRecordsCount;

  const payloads = await mongodb.client.withSession((session) =>
    session.withTransaction(async (session) => {
      const responseTextFieldsPayload: UpdateNotePayloadPatch['textFields'] = [];
      const publishTextFieldsPayload: NoteUpdatedPayloadPatch['textFields'] = [];

      let payloadPatch: Awaited<Omit<PayloadPatch, 'id'>> | undefined;
      let userNoteUpdate: UpdateFilter<UserNoteSchema> | undefined;
      let userUpdate: UpdateFilter<UserSchema> | undefined;
      const updateDbPromises: Promise<unknown>[] = [];

      if (patch.textFields) {
        updateDbPromises.push(
          Promise.all(
            patch.textFields.map(async ({ key: fieldName, value: { insertRecord } }) => {
              if (!insertRecord) return;

              // Get relevant records for record insertion and tailText composition
              const [userNoteForInsertion, userNoteForTailText] = await Promise.all([
                datasources.notes.getNote(
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
                                creatorUserId: 1,
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
                ),
                maxRecordsCount != null && maxRecordsCount > 0
                  ? datasources.notes.getNote(
                      {
                        publicId: notePublicId,
                        userId: currentUserId,
                        noteQuery: {
                          note: {
                            collabTexts: {
                              [fieldName]: {
                                _id: 1,
                                tailText: {
                                  changeset: 1,
                                  revision: 1,
                                },
                                records: {
                                  $query: {
                                    revision: 1,
                                    changeset: 1,
                                  },
                                  $pagination: {
                                    before:
                                      insertRecord.change.revision - maxRecordsCount + 2,
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
                    )
                  : Promise.resolve(null),
              ]);

              const collabText = assertCollabTextWithId(
                userNoteForInsertion,
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
                    beforeSelection: SelectionRange.expandSame(
                      insertRecord.beforeSelection
                    ),
                    afterSelection: SelectionRange.expandSame(
                      insertRecord.afterSelection
                    ),
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
                  const { beforeSelection, afterSelection } = insertion.newRecord;

                  const pushRecord = {
                    ...insertion.newRecord,
                    changeset: insertion.newRecord.changeset.serialize(),
                    beforeSelection: SelectionRange.collapseSame(beforeSelection),
                    afterSelection: SelectionRange.collapseSame(afterSelection),
                  };

                  // Compose tailText, deleting older records
                  let newComposedTail:
                    | { tailText: SerializedRevisionChangeset; recordsCount: number }
                    | undefined;
                  if (userNoteForTailText) {
                    const collabTextForTailCompose = assertCollabTextWithId(
                      userNoteForTailText,
                      fieldName,
                      notePublicId
                    );

                    const tailRevisionRecords = new ChangesetRevisionRecords({
                      tailText: RevisionChangeset.parseValue(
                        collabTextForTailCompose.tailText
                      ),
                      revisionRecords: new RevisionRecords({
                        records:
                          collabTextForTailCompose.records?.map((record) =>
                            RevisionChangeset.parseValue(record)
                          ) ?? [],
                      }),
                    });

                    const beforeTailRevision = tailRevisionRecords.tailRevision;

                    tailRevisionRecords.mergeToTail(tailRevisionRecords.records.length);
                    const newTailText = tailRevisionRecords.tailText;

                    if (newTailText.revision > beforeTailRevision) {
                      newComposedTail = {
                        tailText: RevisionChangeset.serialize(newTailText),
                        recordsCount:
                          insertion.newHeadText.revision - newTailText.revision,
                      };
                    }
                  }

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
                          ...(newComposedTail && { tailText: newComposedTail.tailText }),
                        },
                        $push: {
                          records:
                            newComposedTail != null && newComposedTail.recordsCount > 0
                              ? {
                                  $each: [pushRecord],
                                  $slice: -newComposedTail.recordsCount,
                                }
                              : pushRecord,
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
                        code: GraphQLErrorCode.INVALID_INPUT,
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
              await mongodb.collections[CollectionName.COLLAB_TEXTS].bulkWrite(
                recordUpdates,
                {
                  session,
                  ignoreUndefined: false,
                  ordered: true,
                }
              );
            }
          })
        );
      }

      if (patch.preferences?.backgroundColor) {
        userNoteUpdate = {
          ...userNoteUpdate,
          $set: {
            ...userNoteUpdate?.$set,
            'preferences.backgroundColor': patch.preferences.backgroundColor,
          },
        };
        payloadPatch = {
          ...payloadPatch,
          preferences: {
            ...(await payloadPatch?.preferences),
            backgroundColor: patch.preferences.backgroundColor,
          },
        };
      }

      if (patch.categoryName) {
        userNoteUpdate = {
          ...userNoteUpdate,
          $set: {
            ...userNoteUpdate?.$set,
            'category.name': patch.categoryName,
          },
        };
        payloadPatch = {
          ...payloadPatch,
          categoryName: patch.categoryName,
        };

        userUpdate = {
          ...userUpdate,
          $pull: {
            ...userUpdate?.$pull,
            [getNotesArrayPath(existingCategoryName)]: userNoteId,
          },
          $push: {
            ...userUpdate?.$push,
            [getNotesArrayPath(patch.categoryName)]: userNoteId,
          },
        };
      }

      if (userUpdate) {
        updateDbPromises.push(
          mongodb.collections[CollectionName.USERS].updateOne(
            {
              _id: currentUserId,
            },
            userUpdate,
            {
              session,
            }
          )
        );
      }
      if (userNoteUpdate) {
        updateDbPromises.push(
          mongodb.collections[CollectionName.USER_NOTES].updateOne(
            {
              _id: userNoteId,
            },
            userNoteUpdate,
            {
              session,
            }
          )
        );
      }

      await Promise.all(updateDbPromises);

      const haveNothingToPublish =
        publishTextFieldsPayload.length === 0 && isEmptyDeep(payloadPatch);

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
            ...payloadPatch,
          },
        },
        publish: haveNothingToPublish
          ? null
          : {
              contentId: notePublicId,
              patch: {
                id: () => userNoteIdMapper.id(),
                textFields: publishTextFieldsPayload,
                ...payloadPatch,
              },
            },
      };

      return payloads;
    })
  );

  if (payloads.publish !== null) {
    await publishNoteUpdated(ctx, ownerId, payloads.publish);
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
