import { GraphQLError } from 'graphql';
import { ObjectId, UpdateFilter } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { SelectionRange } from '~collab/client/selection-range';
import { ChangesetRevisionRecords } from '~collab/records/changeset-revision-records';
import { RevisionChangeset, SerializedRevisionChangeset } from '~collab/records/record';
import recordInsertion, { RecordInsertionError } from '~collab/records/recordInsertion';
import { RevisionRecords } from '~collab/records/revision-records';
import isEmptyDeep from '~utils/object/isEmptyDeep';

import isDefined from '~utils/type-guards/isDefined';

import { DeepQueryPartial, MongoQuery } from '../../../../mongodb/query/query';
import createCollabText from '../../../../mongodb/schema/collab-text/utils/createCollabText';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { QueryableNote } from '../../../../mongodb/schema/note/query/queryable-note';
import { getNotesArrayPath, UserSchema } from '../../../../mongodb/schema/user/user';
import { MongoDeepPartial } from '../../../../mongodb/types';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  type MutationResolvers,
  ResolversTypes,
  NoteCategory,
} from '../../../types.generated';
import { MongoNotePatchMapper, MongoNotePatch } from '../../mappers/note-patch';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';
import findUserNote from '../../utils/findUserNote';
import { publishNoteUpdated } from '../Subscription/noteUpdated';

// TODO refactor code, merged code by logic to one place: category, preferences, collabText

export const updateNote: NonNullable<MutationResolvers['updateNote']> = async (
  _parent,
  { input: { contentId: notePublicId, patch } },
  ctx
) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const note = await mongodb.loaders.note.load({
    userId: currentUserId,
    publicId: notePublicId,
    noteQuery: {
      _id: 1,
      userNotes: {
        $query: {
          userId: 1,
          readOnly: 1,
          isOwner: 1,
          categoryName: 1,
        },
      },
    },
  });

  const noteId = note._id;
  const userNote = findUserNote(currentUserId, note);
  if (!noteId || !userNote) {
    throw new GraphQLError(`Note '${notePublicId}' not found`, {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
      },
    });
  }

  if (!patch || isEmptyDeep(patch)) {
    return {
      contentId: () => notePublicId,
    };
  }

  const isReadOnly = userNote.readOnly ?? false;
  if (isReadOnly && patch.textFields && patch.textFields.length > 0) {
    throw new GraphQLError(`Note is read-only and text cannot be modified.`, {
      extensions: {
        code: GraphQLErrorCode.READ_ONLY,
      },
    });
  }

  const existingCategoryName = userNote.categoryName ?? NoteCategory.DEFAULT;
  const otherUserIds: ObjectId[] =
    note.userNotes
      ?.map((userNote) => userNote.userId)
      .filter(isDefined)
      .filter((userId) => !userId.equals(currentUserId)) ?? [];
  const maxRecordsCount = ctx.options?.collabText?.maxRecordsCount;

  const noteUserPatch: DeepQueryPartial<QueryableNote['userNotes'][0]> = {
    userId: currentUserId,
  };
  const notePatch: DeepQueryPartial<Omit<QueryableNote, 'collabTexts'>> = {
    _id: noteId,
    publicId: notePublicId,
    userNotes: [noteUserPatch],
  };
  const notePatchExtra: DeepQueryPartial<MongoNotePatch> = {};
  const publishNotePatchExtra: DeepQueryPartial<MongoNotePatch> = {};
  let publishToCurrentUser = false;
  let publishToOtherUsers = false;

  function updateNotePatchExtra(
    mergePatchExtra: (patch: DeepQueryPartial<MongoNotePatch>) => void,
    publish: boolean
  ) {
    mergePatchExtra(notePatchExtra);
    if (publish) {
      publishToCurrentUser = true;
      publishToOtherUsers = true;
      mergePatchExtra(publishNotePatchExtra);
    }
  }

  await mongodb.client.withSession((session) =>
    session.withTransaction(async (session) => {
      let transactionStarted = false;
      let userUpdate: UpdateFilter<UserSchema> | undefined;
      let noteUpdate: UpdateFilter<NoteSchema> | undefined;
      const currenUserNoteFilterName = 'currentUserNote';
      let needCurrentUserNoteFilter = false;
      const textFieldArrayFilters: Document[] = [];
      const currentUserNoteArrayFilter: Document = {
        [`${currenUserNoteFilterName}.userId`]: currentUserId,
      };

      if (patch.textFields) {
        const seenTextFieldKeys = new Set<string>();
        await Promise.all(
          patch.textFields.map(async ({ key: fieldName, value: { insertRecord } }) => {
            if (!insertRecord) return;

            if (seenTextFieldKeys.has(fieldName)) return;
            seenTextFieldKeys.add(fieldName);

            // Get relevant records for record insertion and tailText composition
            const [userNoteForInsertion, userNoteForTailText] = await Promise.all([
              mongodb.loaders.note.load(
                {
                  publicId: notePublicId,
                  userId: currentUserId,
                  noteQuery: {
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
                {
                  session,
                }
              ),
              maxRecordsCount != null && maxRecordsCount > 0
                ? mongodb.loaders.note.load(
                    {
                      publicId: notePublicId,
                      userId: currentUserId,
                      noteQuery: {
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
                    {
                      session,
                    }
                  )
                : Promise.resolve(null),
            ]);
            transactionStarted = true;

            const collabText = userNoteForInsertion.collabTexts?.[fieldName];

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
                $push: {
                  ...noteUpdate?.$push,
                  collabTexts: {
                    k: fieldName,
                    v: newCollabText,
                  },
                },
              };

              // add this only if
              // publishToCurrentUser = true;
              // publishToOtherUsers = true;
              // notePatchExtra.collabTexts = {
              //   ...notePatchExtra.collabTexts,
              //   [fieldName]: {
              //     newRecord,
              //     isExistingRecord: false,
              //   },
              // };
              updateNotePatchExtra((note) => {
                note.collabTexts = {
                  ...note.collabTexts,
                  [fieldName]: {
                    newRecord,
                    isExistingRecord: false,
                  },
                };
              }, true);

              // Return since it's a new field
              return;
            }

            try {
              const partInsertRecord = {
                creatorUserId: currentUserId,
                beforeSelection: SelectionRange.expandSame(insertRecord.beforeSelection),
                afterSelection: SelectionRange.expandSame(insertRecord.afterSelection),
              };

              // Process record, following any future records
              const insertion = recordInsertion({
                serializedHeadText: collabText?.headText?.changeset,
                headRevision: collabText?.headText?.revision,
                serializedRecords: collabText?.records,
                insertRecord: {
                  userGeneratedId: insertRecord.generatedId,
                  revision: insertRecord.change.revision,
                  changeset: insertRecord.change.changeset,
                  ...partInsertRecord,
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
                    userNoteForTailText.collabTexts?.[fieldName];

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

                const arrayIdentifier = `collabTexts${fieldName}`;
                const collabTextPath = `collabTexts.$[${arrayIdentifier}].v`;
                textFieldArrayFilters.push({
                  [`${arrayIdentifier}.k`]: fieldName,
                });

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
              }

              // publishToCurrentUser = true;
              // publishToOtherUsers = true;
              // this is only for response, dont publish if isExistingRecord
              // notePatchExtra.collabTexts = {
              //   ...notePatchExtra.collabTexts,
              //   [fieldName]: insertion.isExisting
              //     ? {
              //         isExistingRecord: true,
              //         newRecord: {
              //           ...partInsertRecord,
              //           ...insertion.existingRecord,
              //         },
              //       }
              //     : {
              //         isExistingRecord: false,
              //         newRecord: insertion.newRecord,
              //       },
              // };
              updateNotePatchExtra((note) => {
                note.collabTexts = {
                  ...note.collabTexts,
                  [fieldName]: insertion.isExisting
                    ? {
                        isExistingRecord: true,
                        newRecord: {
                          ...partInsertRecord,
                          ...insertion.existingRecord,
                        },
                      }
                    : {
                        isExistingRecord: false,
                        newRecord: insertion.newRecord,
                      },
                };
              }, !insertion.isExisting);

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
        needCurrentUserNoteFilter = true;
        noteUpdate = {
          ...noteUpdate,
          $set: {
            ...noteUpdate?.$set,
            [`userNotes.$[${currenUserNoteFilterName}].preferences.backgroundColor`]:
              patch.preferences.backgroundColor,
          },
        };
        publishToCurrentUser = true;
        noteUserPatch.preferences = {
          ...noteUserPatch.preferences,
          backgroundColor: patch.preferences.backgroundColor,
        };
      }

      if (patch.categoryName) {
        needCurrentUserNoteFilter = true;
        noteUpdate = {
          ...noteUpdate,
          $set: {
            ...noteUpdate?.$set,
            [`userNotes.$[${currenUserNoteFilterName}].categoryName`]: patch.categoryName,
          },
        };
        publishToCurrentUser = true;
        noteUserPatch.categoryName = patch.categoryName;

        userUpdate = {
          ...userUpdate,
          $pull: {
            ...userUpdate?.$pull,
            [getNotesArrayPath(existingCategoryName)]: noteId,
          },
          $push: {
            ...userUpdate?.$push,
            [getNotesArrayPath(patch.categoryName)]: noteId,
          },
        };
      }

      const startUserUpdate = () =>
        userUpdate &&
        mongodb.collections.users.updateOne(
          {
            _id: currentUserId,
          },
          userUpdate,
          {
            session,
          }
        );
      const startNoteUpdate = () =>
        noteUpdate &&
        mongodb.collections.notes.updateOne(
          {
            _id: noteId,
          },
          noteUpdate,
          {
            arrayFilters: [
              ...(needCurrentUserNoteFilter ? [currentUserNoteArrayFilter] : []),
              ...textFieldArrayFilters,
            ],
            session,
          }
        );

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (transactionStarted) {
        await Promise.all([startUserUpdate(), startNoteUpdate()]);
      } else {
        await startUserUpdate();
        await startNoteUpdate();
      }
    })
  );

  const notePatchQuery: MongoQuery<QueryableNote> = {
    query() {
      return notePatch;
    },
  };

  function createResponseForUser(
    userId: ObjectId,
    patchExtra: MongoDeepPartial<MongoNotePatch>
  ): ResolversTypes['UpdateNotePayload'] & ResolversTypes['NoteUpdatedPayload'] {
    const patch = new MongoNotePatchMapper(
      new NoteQueryMapper(userId, notePatchQuery),
      patchExtra
    );

    return {
      contentId: () => patch.contentId(),
      patch: () => patch,
    };
  }

  await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    publishToCurrentUser &&
      publishNoteUpdated(
        currentUserId,
        createResponseForUser(currentUserId, publishNotePatchExtra),
        ctx
      ),
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    publishToOtherUsers &&
      otherUserIds.map((otherUserId) =>
        publishNoteUpdated(
          otherUserId,
          createResponseForUser(otherUserId, publishNotePatchExtra),
          ctx
        )
      ),
  ]);

  return createResponseForUser(currentUserId, notePatchExtra);
};
