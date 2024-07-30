import { GraphQLError } from 'graphql';
import { UpdateFilter } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { SelectionRange } from '~collab/client/selection-range';
import { ChangesetRevisionRecords } from '~collab/records/changeset-revision-records';
import { RevisionChangeset, SerializedRevisionChangeset } from '~collab/records/record';
import recordInsertion, { RecordInsertionError } from '~collab/records/recordInsertion';
import { RevisionRecords } from '~collab/records/revision-records';
import { ErrorWithData } from '~utils/logger';
import isEmptyDeep from '~utils/object/isEmptyDeep';

import { MongoQuery } from '../../../../mongodb/query/query';
import createCollabText from '../../../../mongodb/schema/collab-text/utils/createCollabText';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { getNotesArrayPath, UserSchema } from '../../../../mongodb/schema/user/user';
import { QueryableUserNote } from '../../../../mongodb/schema/user-note/query/queryable-user-note';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note/user-note';
import { assertAuthenticated } from '../../../base/directives/auth';
import { CollabTextRecordQueryMapper } from '../../../collab/mongo-query-mapper/revision-record';
import {
  type MutationResolvers,
  ResolversTypes,
  NoteCategory,
} from '../../../types.generated';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';
import { NoteCollabTextQueryMapper } from '../../mongo-query-mapper/note-collab-text';
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
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const userNote = await mongodb.loaders.userNote.load({
    userId: currentUserId,
    publicId: notePublicId,
    userNoteQuery: {
      _id: 1,
      readOnly: 1,
      note: {
        _id: 1,
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

  const noteId = userNote.note?._id;
  if (!noteId) {
    throw new ErrorWithData(`Expected UserNote.note._id to be defined`, {
      userId: currentUserId,
      notePublicId,
      userNote,
    });
  }

  const ownerId = userNote.note.ownerId;
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

  const noteQuery_onlyId: MongoQuery<QueryableUserNote> = {
    query() {
      return {
        _id: userNoteId,
        note: {
          _id: noteId,
        },
      };
    },
  };

  const payloads = await mongodb.client.withSession((session) =>
    session.withTransaction(async (session) => {
      const responseTextFieldsPayload: UpdateNotePayloadPatch['textFields'] = [];
      const publishTextFieldsPayload: NoteUpdatedPayloadPatch['textFields'] = [];

      let payloadPatch: Awaited<Omit<PayloadPatch, 'id'>> | undefined;
      let userUpdate: UpdateFilter<UserSchema> | undefined;
      let userNoteUpdate: UpdateFilter<UserNoteSchema> | undefined;
      let noteUpdate: UpdateFilter<NoteSchema> | undefined;

      if (patch.textFields) {
        await Promise.all(
          patch.textFields.map(async ({ key: fieldName, value: { insertRecord } }) => {
            if (!insertRecord) return;

            // Get relevant records for record insertion and tailText composition
            const [userNoteForInsertion, userNoteForTailText] = await Promise.all([
              mongodb.loaders.userNote.load(
                {
                  publicId: notePublicId,
                  userId: currentUserId,
                  userNoteQuery: {
                    note: {
                      collabTexts: {
                        [fieldName]: {
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
                ? mongodb.loaders.userNote.load(
                    {
                      publicId: notePublicId,
                      userId: currentUserId,
                      userNoteQuery: {
                        note: {
                          collabTexts: {
                            [fieldName]: {
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

            const collabText = userNoteForInsertion.note?.collabTexts?.[fieldName];

            const collabTextPath = `collabTexts.${fieldName}`;
            const noteCollabText_onlyId = new NoteCollabTextQueryMapper(
              noteQuery_onlyId,
              fieldName,
              {
                query() {
                  return null;
                },
              }
            );

            // Unknown new field, create the field with initial value
            const isNewFieldInsertion =
              collabText &&
              !collabText.headText &&
              (!collabText.records || collabText.records.length === 0);
            if (isNewFieldInsertion) {
              const newCollabText = createCollabText({
                initalText: insertRecord.change.changeset.joinInsertions(),
                creatorUserId: currentUserId,
                afterSelection: {
                  start: insertRecord.afterSelection.start,
                  ...(insertRecord.afterSelection.end != null && {
                    end: insertRecord.afterSelection.end,
                  }),
                },
              });

              const newRecord = newCollabText.records[0];

              noteUpdate = {
                ...noteUpdate,
                $set: {
                  ...noteUpdate?.$set,
                  [collabTextPath]: newCollabText,
                },
              };

              const newFieldPayload: ResolversTypes['NoteTextFieldEntryPatch'] = {
                key: fieldName,
                value: {
                  id: () => noteCollabText_onlyId.id(),
                  newRecord: new CollabTextRecordQueryMapper(noteCollabText_onlyId, {
                    query() {
                      return newRecord;
                    },
                  }),
                  isExistingRecord: false,
                },
              };
              responseTextFieldsPayload.push(newFieldPayload);
              publishTextFieldsPayload.push(newFieldPayload);

              // Return since it's a new field
              return;
            }

            try {
              // Process record, following any future records
              const insertion = recordInsertion({
                serializedHeadText: collabText?.headText?.changeset,
                headRevision: collabText?.headText?.revision,
                serializedRecords: collabText?.records,
                insertRecord: {
                  userGeneratedId: insertRecord.generatedId,
                  revision: insertRecord.change.revision,
                  changeset: insertRecord.change.changeset,
                  creatorUserId: currentUserId,
                  beforeSelection: SelectionRange.expandSame(
                    insertRecord.beforeSelection
                  ),
                  afterSelection: SelectionRange.expandSame(insertRecord.afterSelection),
                },
              });

              // Response payload
              responseTextFieldsPayload.push({
                key: fieldName,
                value: {
                  id: () => noteCollabText_onlyId.id(),
                  newRecord: new CollabTextRecordQueryMapper(
                    noteCollabText_onlyId,
                    !insertion.isExisting
                      ? {
                          query() {
                            return insertion.newRecord;
                          },
                        }
                      : {
                          async query(query) {
                            if (
                              query.creatorUserId != null ||
                              query.afterSelection != null ||
                              query.beforeSelection != null
                            ) {
                              // Cannot use session here since query happens outside withSession after this field resolver has returned
                              const missingRecordValues = (
                                await mongodb.loaders.userNote.load({
                                  publicId: notePublicId,
                                  userId: currentUserId,
                                  userNoteQuery: {
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
                  const collabTextForTailCompose =
                    userNoteForTailText.note?.collabTexts?.[fieldName];

                  const tailRevisionRecords = new ChangesetRevisionRecords({
                    tailText: RevisionChangeset.parseValue(
                      collabTextForTailCompose?.tailText
                    ),
                    revisionRecords: new RevisionRecords({
                      records:
                        collabTextForTailCompose?.records?.map((record) =>
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
                      recordsCount: insertion.newHeadText.revision - newTailText.revision,
                    };
                  }
                }

                noteUpdate = {
                  ...noteUpdate,
                  $set: {
                    ...noteUpdate?.$set,
                    [`${collabTextPath}.headText.revision`]:
                      insertion.newHeadText.revision,
                    [`${collabTextPath}.headText.changeset`]:
                      insertion.newHeadText.changeset.serialize(),
                    ...(newComposedTail && {
                      [`${collabTextPath}.tailText`]: newComposedTail.tailText,
                    }),
                  },
                  $push: {
                    ...noteUpdate?.$push,
                    [`${collabTextPath}.records`]:
                      newComposedTail != null && newComposedTail.recordsCount > 0
                        ? {
                            $each: [pushRecord],
                            $slice: -newComposedTail.recordsCount,
                          }
                        : pushRecord,
                  },
                };

                // Publish payload
                publishTextFieldsPayload.push({
                  key: fieldName,
                  value: {
                    id: () => noteCollabText_onlyId.id(),
                    newRecord: new CollabTextRecordQueryMapper(noteCollabText_onlyId, {
                      query() {
                        return insertion.newRecord;
                      },
                    }),
                    isExistingRecord: false,
                  },
                });
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

      await Promise.all([
        userUpdate &&
          mongodb.collections.users.updateOne(
            {
              _id: currentUserId,
            },
            userUpdate,
            {
              session,
            }
          ),
        userNoteUpdate &&
          mongodb.collections.userNotes.updateOne(
            {
              _id: userNoteId,
            },
            userNoteUpdate,
            {
              session,
            }
          ),
        noteUpdate &&
          mongodb.collections.notes.updateOne(
            {
              _id: noteId,
            },
            noteUpdate,
            {
              session,
            }
          ),
      ]);

      const haveNothingToPublish =
        publishTextFieldsPayload.length === 0 && isEmptyDeep(payloadPatch);

      const noteMapper_onlyId = new NoteQueryMapper(noteQuery_onlyId);

      const payloads: {
        response: UpdateNotePayload;
        publish: NoteUpdatedPayload | null;
      } = {
        response: {
          contentId: notePublicId,
          patch: {
            id: () => noteMapper_onlyId.id(),
            textFields: responseTextFieldsPayload,
            ...payloadPatch,
          },
        },
        publish: haveNothingToPublish
          ? null
          : {
              contentId: notePublicId,
              patch: {
                id: () => noteMapper_onlyId.id(),
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
