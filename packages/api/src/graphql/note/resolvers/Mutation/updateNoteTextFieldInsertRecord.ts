import { GraphQLError } from 'graphql';

import { ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { SelectionRange } from '~collab/client/selection-range';
import { ChangesetRevisionRecords } from '~collab/records/changeset-revision-records';
import { RevisionChangeset, SerializedRevisionChangeset } from '~collab/records/record';
import { recordInsertion, RecordInsertionError } from '~collab/records/record-insertion';
import { RevisionRecords } from '~collab/records/revision-records';
import { isDefined } from '~utils/type-guards/is-defined';

import { RelayPagination } from '../../../../mongodb/pagination/relay-array-pagination';
import { createCollabText } from '../../../../mongodb/schema/collab-text/utils/create-collab-text';
import { assertAuthenticated } from '../../../base/directives/auth';
import { objectIdToStr } from '../../../base/resolvers/ObjectID';
import { throwNoteIsReadOnly, throwNoteNotFound } from '../../utils/note-errors';
import { findNoteUser } from '../../utils/user-note';
import { publishNoteUpdated } from '../Subscription/noteEvents';

import type { MutationResolvers } from './../../../types.generated';
import { CollabTextRecordMapper } from '../../../collab/schema.mappers';
import { MongoQueryFn } from '../../../../mongodb/query/query';
import { QueryableNote } from '../../../../mongodb/schema/note/query/queryable-note';
import { NoteMapper } from '../../schema.mappers';
import { Note_id, Note_textFields_value } from '../Note';

export const updateNoteTextFieldInsertRecord: NonNullable<
  MutationResolvers['updateNoteTextFieldInsertRecord']
> = async (_parent, args, ctx) => {
  const {
    input: { noteId, insertRecord, textField },
  } = args;
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const maxRecordsCount = ctx.options?.collabText?.maxRecordsCount;

  // Transaction: read db => calc and push new record => update db
  const { isExistingRecord, newRecord, allUserIds } = await mongodb.client.withSession(
    (session) =>
      session.withTransaction(async (session) => {
        // Load all relevent note data at once
        // noteForInsertion - all future records to be composed on, normally empty if no one else has inserted records
        // noteForTailText - oldest records based on maxRecordCount for keeping tailText up-to-date
        const [note, noteForInsertion, noteForTailText] = await Promise.all([
          mongodb.loaders.note.load(
            {
              id: {
                userId: currentUserId,
                noteId,
              },
              query: {
                _id: 1,
                users: {
                  _id: 1,
                  readOnly: 1,
                },
              },
            },
            session
          ),
          mongodb.loaders.note.load(
            {
              id: {
                userId: currentUserId,
                noteId,
              },
              query: {
                collabTexts: {
                  [textField]: {
                    headText: {
                      changeset: 1,
                      revision: 1,
                    },
                    records: {
                      $pagination: {
                        after: insertRecord.change.revision,
                      },
                      userGeneratedId: 1,
                      revision: 1,
                      changeset: 1,
                      creatorUserId: 1,
                    },
                  },
                },
              },
            },
            session
          ),
          maxRecordsCount != null && maxRecordsCount > 0
            ? mongodb.loaders.note.load(
                {
                  id: {
                    userId: currentUserId,
                    noteId,
                  },
                  query: {
                    collabTexts: {
                      [textField]: {
                        tailText: {
                          changeset: 1,
                          revision: 1,
                        },
                        records: {
                          $pagination: {
                            before: insertRecord.change.revision - maxRecordsCount + 2,
                          },
                          revision: 1,
                          changeset: 1,
                        },
                      },
                    },
                  },
                },
                session
              )
            : Promise.resolve(null),
        ]);

        const noteUser = findNoteUser(currentUserId, note);
        if (!note?._id || !noteUser) {
          throwNoteNotFound(noteId);
        }

        const isReadOnly = noteUser.readOnly ?? false;
        if (isReadOnly) {
          throwNoteIsReadOnly(noteId);
        }

        const allUserIds: ObjectId[] =
          note.users?.map((noteUser) => noteUser._id).filter(isDefined) ?? [];

        const collabText = noteForInsertion?.collabTexts?.[textField];

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

          // Commit new record
          await mongodb.collections.notes.updateOne(
            {
              _id: noteId,
            },
            {
              $push: {
                collabTexts: {
                  k: textField,
                  v: newCollabText,
                },
              },
            },
            {
              session,
            }
          );
          const paginationsToPrime: (RelayPagination<number> | undefined)[] = [
            undefined,
            {
              last: 20,
            },
            { last: 1 },
          ];
          paginationsToPrime.forEach((pagination) => {
            mongodb.loaders.note.prime(
              {
                id: {
                  userId: currentUserId,
                  noteId,
                },
                query: {
                  collabTexts: {
                    [textField]: {
                      headText: {
                        revision: 1,
                        changeset: 1,
                      },
                      tailText: {
                        revision: 1,
                        changeset: 1,
                      },
                      records: {
                        $pagination: pagination,
                        creatorUserId: 1,
                        userGeneratedId: 1,
                        revision: 1,
                        changeset: 1,
                        beforeSelection: {
                          start: 1,
                          end: 1,
                        },
                        afterSelection: {
                          start: 1,
                          end: 1,
                        },
                      },
                    },
                  },
                },
              },
              {
                collabTexts: {
                  [textField]: newCollabText,
                },
              },
              { clearCache: true }
            );
          });

          // Return since it's a new field
          return {
            newRecord,
            isExistingRecord: false,
            allUserIds,
          };
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
              beforeSelection: SelectionRange.expandSame(insertRecord.beforeSelection),
              afterSelection: SelectionRange.expandSame(insertRecord.afterSelection),
            },
          });

          if (!insertion.isExisting) {
            // Record is new
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
            if (noteForTailText) {
              const collabTextForTailCompose = noteForTailText.collabTexts?.[textField];

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

            const arrayIdentifier = `collabTexts${textField}`;
            const collabTextPath = `collabTexts.$[${arrayIdentifier}].v`;

            // Commit new record
            await mongodb.collections.notes.updateOne(
              {
                _id: noteId,
              },
              {
                $set: {
                  [`${collabTextPath}.headText.revision`]: insertion.newHeadText.revision,
                  [`${collabTextPath}.headText.changeset`]:
                    insertion.newHeadText.changeset.serialize(),
                  ...(newComposedTail && {
                    [`${collabTextPath}.tailText`]: newComposedTail.tailText,
                  }),
                },
                $push: {
                  [`${collabTextPath}.records`]:
                    newComposedTail != null && newComposedTail.recordsCount > 0
                      ? {
                          $each: [pushRecord],
                          $slice: -newComposedTail.recordsCount,
                        }
                      : pushRecord,
                },
              },
              {
                arrayFilters: [
                  {
                    [`${arrayIdentifier}.k`]: textField,
                  },
                ],
                session,
              }
            );
            mongodb.loaders.note.prime(
              {
                id: {
                  userId: currentUserId,
                  noteId,
                },
                query: {
                  collabTexts: {
                    [textField]: {
                      headText: {
                        revision: 1,
                        changeset: 1,
                      },
                      records: {
                        $pagination: { last: 1 },
                        creatorUserId: 1,
                        userGeneratedId: 1,
                        revision: 1,
                        changeset: 1,
                        beforeSelection: {
                          start: 1,
                          end: 1,
                        },
                        afterSelection: {
                          start: 1,
                          end: 1,
                        },
                      },
                    },
                  },
                },
              },
              {
                collabTexts: {
                  [textField]: {
                    headText: {
                      changeset: insertion.newHeadText.changeset.serialize(),
                      revision: insertion.newHeadText.revision,
                    },
                    records: [pushRecord],
                  },
                },
              },
              { clearCache: true } // TODO test this ok?
            );
            if (newComposedTail) {
              mongodb.loaders.note.prime(
                {
                  id: {
                    userId: currentUserId,
                    noteId,
                  },
                  query: {
                    collabTexts: {
                      [textField]: {
                        tailText: {
                          revision: 1,
                          changeset: 1,
                        },
                      },
                    },
                  },
                },
                {
                  collabTexts: {
                    [textField]: {
                      tailText: newComposedTail.tailText,
                    },
                  },
                },
                { clearCache: true } // TODO test this ok?
              );
            }

            return {
              newRecord: insertion.newRecord,
              isExistingRecord: false,
              allUserIds,
            };
          }

          return {
            newRecord: insertion.existingRecord,
            isExistingRecord: true,
            allUserIds,
          };
        } catch (err) {
          if (err instanceof RecordInsertionError) {
            throw new GraphQLError(
              `Note '${objectIdToStr(noteId)}' field ${textField}. ${err.message}`,
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

  function createMappersForUser(userId: ObjectId) {
    const queryNote: MongoQueryFn<QueryableNote> = (query) =>
      mongodb.loaders.note.load({
        id: {
          userId: currentUserId,
          noteId,
        },
        query,
      });
    const noteMapper: NoteMapper = {
      userId,
      query: queryNote,
    };

    const collabTextMapper = Note_textFields_value(textField, queryNote);

    const collabTextRecordMapper: CollabTextRecordMapper = {
      parentId: collabTextMapper.id,
      query: () => newRecord,
    };

    return {
      note: noteMapper,
      collabText: collabTextMapper,
      newRecord: collabTextRecordMapper,
    };
  }

  // Subscription, only publish new record insertion
  if (!isExistingRecord) {
    await Promise.all(
      allUserIds.map(async (userId) => {
        const userMappers = createMappersForUser(userId);

        return publishNoteUpdated(
          userId,
          {
            note: {
              id: () => Note_id(userMappers.note),
              textFields: () => [
                {
                  key: textField,
                  value: {
                    id: userMappers.collabText.id,
                    newRecord: userMappers.newRecord,
                    isExistingRecord,
                  },
                },
              ],
            },
          },
          ctx
        );
      })
    );
  }

  const currentUserMappers = createMappersForUser(currentUserId);

  // Response
  return {
    isExistingRecord,
    textField,
    newRecord: currentUserMappers.newRecord,
    note: currentUserMappers.note,
  };
};
