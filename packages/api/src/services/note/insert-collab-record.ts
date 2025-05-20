import { MongoClient, ObjectId } from 'mongodb';

import { assign, object, array } from 'superstruct';

import { Maybe } from '../../../../utils/src/types';

import {
  Changeset,
  composeNewTail,
  processSubmittedRecord,
  ServerError,
  ServerRecord,
  SubmittedRecord,
} from '../../../../collab/src';
import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { QueryableCollabRecord } from '../../mongodb/loaders/note/descriptions/collab-record';
import { insertRecord as model_insertRecord } from '../../mongodb/models/note/insert-record';
import { updateSetCollabText } from '../../mongodb/models/note/update-set-collab-text';
import { createCollabRecord } from '../../mongodb/models/note/utils/create-collab-record';
import { createInitialCollabText } from '../../mongodb/models/note/utils/create-initial-collab-text';

import { CollabRecordSchema } from '../../mongodb/schema/collab-record';
import { CollabTextSchema } from '../../mongodb/schema/collab-text';
import { NoteSchema } from '../../mongodb/schema/note';

import { MongoReadonlyDeep } from '../../mongodb/types';
import { objectIdToStr } from '../../mongodb/utils/objectid';
import { withTransaction } from '../../mongodb/utils/with-transaction';

import {
  NoteCollabRecordInsertError,
  NoteNotFoundServiceError,
  NoteReadOnlyServiceError,
} from './errors';
import { findNoteUser } from './note';
import { updateOpenNoteAndPrime } from './update-open-note-selection-range';

interface InsertCollabRecordParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<
      MongoDBCollections,
      CollectionName.NOTES | CollectionName.COLLAB_RECORDS | CollectionName.OPEN_NOTES
    >;
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  /**
   * User who can access the note
   */
  userId: ObjectId;
  /**
   * Target note
   */
  noteId: ObjectId;
  /**
   * New record to be inserted
   */
  insertRecord: Pick<
    CollabRecordSchema,
    'idempotencyId' | 'revision' | 'changeset' | 'selection' | 'selectionInverse'
  >;
  /**
   * Limit the records array by deleting older records
   */
  maxRecordsCount?: Maybe<number>;
  openNoteDuration?: number;
  connectionId?: string;
}

export function insertCollabRecord({
  mongoDB,
  userId,
  noteId,
  insertRecord,
  maxRecordsCount,
  openNoteDuration,
  connectionId,
}: InsertCollabRecordParams) {
  return withTransaction(
    mongoDB.client,
    async ({ runSingleOperation }) => {
      // Load all relevent note data at once
      // noteForInsertion - all future records to be composed on, normally empty if no one else has inserted records
      // noteForTailText - oldest records based on maxRecordCount for keeping tailRecord up-to-date and limiting record count
      const [note, noteForInsertion, noteForTailText] = await Promise.all([
        runSingleOperation((session) =>
          mongoDB.loaders.note.load(
            {
              id: {
                userId,
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
            {
              session,
            }
          )
        ),
        runSingleOperation((session) =>
          mongoDB.loaders.note.load(
            {
              id: {
                userId,
                noteId,
              },
              query: {
                collabText: {
                  headRecord: {
                    revision: 1,
                    text: 1,
                  },
                  records: {
                    $pagination: {
                      after: insertRecord.revision,
                    },
                    idempotencyId: 1,
                    revision: 1,
                    changeset: 1,
                    inverse: 1,
                    author: {
                      _id: 1,
                    },
                    selectionInverse: 1,
                    selection: 1,
                  },
                },
                users: {
                  _id: 1,
                  openNote: {
                    clients: {
                      connectionId: 1,
                    },
                  },
                },
              },
            },
            {
              session,
            }
          )
        ),
        maxRecordsCount != null && maxRecordsCount > 0
          ? runSingleOperation((session) =>
              mongoDB.loaders.note.load(
                {
                  id: {
                    userId,
                    noteId,
                  },
                  query: {
                    collabText: {
                      tailRecord: {
                        text: 1,
                        revision: 1,
                      },
                      records: {
                        $pagination: {
                          before: insertRecord.revision - maxRecordsCount + 2,
                        },
                        revision: 1,
                        changeset: 1,
                      },
                    },
                  },
                },
                {
                  session,
                }
              )
            )
          : Promise.resolve(null),
      ]);

      const noteUser = findNoteUser(userId, note);
      if (!noteUser) {
        throw new NoteNotFoundServiceError(noteId);
      }
      if (noteUser.readOnly) {
        throw new NoteReadOnlyServiceError(noteId);
      }

      const collabText = noteForInsertion.collabText;

      // collabText has note been created, create and return it
      if (!collabText) {
        const newCollabText = createInitialCollabText({
          collabTextId: noteId,
          initialText: insertRecord.changeset.joinInsertions(),
          authorId: userId,
          selection: insertRecord.selection,
          toTail: false,
        });

        await updateSetCollabText({
          mongoDB: {
            runSingleOperation,
            collections: mongoDB.collections,
          },
          noteId,
          collabText: newCollabText.collabText,
          collabRecords: newCollabText.collabRecords,
        });

        const newRecord = newCollabText.collabRecords[0];

        mongoDB.loaders.note.prime(
          {
            id: {
              noteId,
              userId,
            },
          },
          {
            _id: noteId,
            collabText: {
              ...newCollabText.collabText,
              records: newCollabText.collabRecords.map((record) => ({
                ...record,
                author: {
                  _id: record.authorId,
                },
              })),
            },
          },
          {
            valueToQueryOptions: {
              fillStruct: assign(
                NoteSchema,
                object({
                  collabText: assign(
                    CollabTextSchema,
                    object({
                      records: array(
                        assign(
                          CollabRecordSchema,
                          object({
                            author: object({
                              _id: CollabRecordSchema.schema.authorId,
                            }),
                          })
                        )
                      ),
                    })
                  ),
                })
              ),
              visitorFn: ({ addPermutationsByPath }) => {
                addPermutationsByPath('collabText.records', [
                  {
                    $pagination: {
                      last: 1,
                    },
                  },
                  {
                    $pagination: {
                      last: 20,
                    },
                  },
                ]);
              },
            },
          }
        );

        return {
          type: 'new' as const,
          record: newRecord,
          note,
        };
      }

      try {
        const originalInsertRecord: MongoReadonlyDeep<
          Pick<
            CollabRecordSchema,
            | 'idempotencyId'
            | 'authorId'
            | 'revision'
            | 'changeset'
            | 'selectionInverse'
            | 'selection'
          >
        > = {
          ...insertRecord,
          authorId: userId,
        };

        const insertion = processSubmittedRecord(
          toSubmittedRecord(originalInsertRecord),
          collabText.records.map(toServerRecord),
          {
            revision: collabText.headRecord.revision,
            text: Changeset.fromText(collabText.headRecord.text),
          }
        );

        const processedInsertRecord: CollabRecordSchema = createCollabRecord({
          ...toCollabRecord(insertion.record, originalInsertRecord),
          collabTextId: noteId,
        });

        if (insertion.type === 'new') {
          // Compose tailRecord, deleting older records

          let newTailText:
            | {
                revision: number;
                changeset: Changeset;
              }
            | undefined;
          if (noteForTailText?.collabText) {
            const newTailRecord = composeNewTail(
              {
                revision: noteForTailText.collabText.tailRecord.revision,
                text: Changeset.fromText(noteForTailText.collabText.tailRecord.text),
              },
              noteForTailText.collabText.records.map(toTailServerRecord)
            );

            newTailText = {
              revision: newTailRecord.revision,
              changeset: newTailRecord.text,
            };
          }

          await Promise.all([
            model_insertRecord({
              mongoDB: {
                runSingleOperation,
                collections: mongoDB.collections,
              },
              noteId,
              headRecord: {
                revision: insertion.headRecord.revision,
                text: insertion.headRecord.text.getText(),
              },
              tailRecord: newTailText && {
                revision: newTailText.revision,
                text: newTailText.changeset.getText(),
              },
              newRecord: processedInsertRecord,
            }),
            ...(connectionId
              ? [
                  updateOpenNoteAndPrime({
                    openCollabText: {
                      revision: processedInsertRecord.revision,
                      latestSelection: processedInsertRecord.selection,
                    },
                    connectionId,
                    openNoteDuration,
                    mongoDB,
                    userId,
                    note: {
                      _id: noteId,
                      users: noteForInsertion.users,
                    },
                    upsertOpenNote: false,
                  }),
                ]
              : []),
          ]);

          mongoDB.loaders.note.prime(
            {
              id: {
                noteId,
                userId,
              },
            },
            {
              _id: noteId,
              collabText: {
                headRecord: {
                  revision: insertion.headRecord.revision,
                  text: insertion.headRecord.text.getText(),
                },
                ...(newTailText && {
                  tailRecord: newTailText,
                }),
              },
            }
          );
          mongoDB.loaders.note.prime(
            {
              id: {
                noteId,
                userId,
              },
            },
            {
              _id: noteId,
              collabText: {
                records: [
                  {
                    ...processedInsertRecord,
                    author: {
                      _id: processedInsertRecord.authorId,
                    },
                  },
                ],
              },
            },
            {
              valueToQueryOptions: {
                fillStruct: assign(
                  NoteSchema,
                  object({
                    collabText: assign(
                      CollabTextSchema,
                      object({
                        records: array(
                          assign(
                            CollabRecordSchema,
                            object({
                              author: object({
                                _id: CollabRecordSchema.schema.authorId,
                              }),
                            })
                          )
                        ),
                      })
                    ),
                  })
                ),
                visitorFn: ({ addPermutationsByPath }) => {
                  addPermutationsByPath('collabText.records', [
                    {
                      $pagination: {
                        last: 1,
                      },
                    },
                  ]);
                },
              },
            }
          );
        }

        return {
          type: insertion.type,
          record: processedInsertRecord,
          note,
        };
      } catch (err) {
        if (err instanceof ServerError) {
          throw new NoteCollabRecordInsertError(noteId, err);
        } else {
          throw err;
        }
      }
    },
    {
      skipAwaitFirstOperation: true,
    }
  );
}

function toSubmittedRecord(
  record: MongoReadonlyDeep<
    Pick<
      CollabRecordSchema,
      | 'idempotencyId'
      | 'authorId'
      | 'revision'
      | 'changeset'
      | 'selection'
      | 'selectionInverse'
    >
  >
): SubmittedRecord {
  return {
    id: record.idempotencyId,
    targetRevision: record.revision,
    authorId: objectIdToStr(record.authorId),
    changeset: record.changeset,
    selectionInverse: record.selectionInverse,
    selection: record.selection,
  };
}

function toServerRecord(
  record: MongoReadonlyDeep<
    Pick<
      QueryableCollabRecord,
      | 'idempotencyId'
      | 'revision'
      | 'changeset'
      | 'inverse'
      | 'selectionInverse'
      | 'selection'
    > & {
      author: Pick<QueryableCollabRecord['author'], '_id'>;
    }
  >
): ServerRecord {
  return {
    idempotencyId: record.idempotencyId,
    authorId: objectIdToStr(record.author._id),
    revision: record.revision,
    changeset: record.changeset,
    inverse: record.inverse,
    selectionInverse: record.selectionInverse,
    selection: record.selection,
  };
}

function toTailServerRecord(
  record: MongoReadonlyDeep<Pick<QueryableCollabRecord, 'revision' | 'changeset'>>
): Pick<ServerRecord, 'revision' | 'changeset'> {
  return {
    revision: record.revision,
    changeset: record.changeset,
  };
}

function toCollabRecord(
  record: ServerRecord,
  original: MongoReadonlyDeep<Pick<CollabRecordSchema, 'authorId'>>
): Pick<
  CollabRecordSchema,
  | 'idempotencyId'
  | 'authorId'
  | 'revision'
  | 'changeset'
  | 'inverse'
  | 'selectionInverse'
  | 'selection'
> {
  return {
    authorId: original.authorId,
    idempotencyId: record.idempotencyId,
    revision: record.revision,
    changeset: record.changeset,
    inverse: record.inverse,
    selectionInverse: record.selectionInverse,
    selection: record.selection,
  };
}
