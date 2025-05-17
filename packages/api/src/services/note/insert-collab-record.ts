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
} from '../../../../collab2/src';
import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
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

type ExistingRecord = Pick<
  CollabRecordSchema,
  | 'afterSelection'
  | 'beforeSelection'
  | 'changeset'
  | 'inverse'
  | 'revision'
  | 'userGeneratedId'
> & {
  creatorUser: Pick<CollabRecordSchema['creatorUser'], '_id'>;
};

type InsertRecord = Omit<ExistingRecord, 'creatorUser' | 'inverse'>;

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
  insertRecord: InsertRecord;
  /**
   * Limit the records array by deleting older records
   */
  maxRecordsCount?: Maybe<number>;
  openNoteDuration?: number;
  connectionId?: string;
}

// TODO move to bottom
function toSubmittedRecord(
  record: MongoReadonlyDeep<Omit<ExistingRecord, 'inverse'>>
): SubmittedRecord {
  return {
    id: record.userGeneratedId,
    targetRevision: record.revision,
    authorId: objectIdToStr(record.creatorUser._id),
    changeset: record.changeset,
    selectionInverse: record.beforeSelection,
    selection: record.afterSelection,
  };
}

// TODO move to bottom
function toServerRecord(record: MongoReadonlyDeep<ExistingRecord>): ServerRecord {
  return {
    idempotencyId: record.userGeneratedId,
    authorId: objectIdToStr(record.creatorUser._id),
    revision: record.revision,
    changeset: record.changeset,
    inverse: record.inverse,
    selectionInverse: record.beforeSelection,
    selection: record.afterSelection,
  };
}

function toServerForTailRecord(
  record: Pick<MongoReadonlyDeep<ExistingRecord>, 'revision' | 'changeset'>
): Pick<ServerRecord, 'revision' | 'changeset'> {
  return {
    revision: record.revision,
    changeset: record.changeset,
  };
}

// TODO move to bottom
function toMongoRecord(
  record: ServerRecord,
  original: MongoReadonlyDeep<Omit<ExistingRecord, 'inverse'>>
): ExistingRecord {
  return {
    creatorUser: original.creatorUser,
    userGeneratedId: record.idempotencyId,
    revision: record.revision,
    changeset: record.changeset,
    inverse: record.inverse,
    beforeSelection: record.selectionInverse,
    afterSelection: record.selection,
  };
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
      // noteForTailText - oldest records based on maxRecordCount for keeping tailText up-to-date and limiting record count
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
                  headText: {
                    changeset: 1,
                    revision: 1,
                  },
                  records: {
                    $pagination: {
                      after: insertRecord.revision,
                    },
                    userGeneratedId: 1,
                    revision: 1,
                    changeset: 1,
                    inverse: 1,
                    creatorUser: {
                      _id: 1,
                    },
                    beforeSelection: 1,
                    afterSelection: 1,
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
                      tailText: {
                        changeset: 1,
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
          creatorUserId: userId,
          afterSelection: insertRecord.afterSelection,
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
              records: newCollabText.collabRecords,
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
                      records: array(CollabRecordSchema),
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
        const originalInsertRecord: MongoReadonlyDeep<Omit<ExistingRecord, 'inverse'>> = {
          ...insertRecord,
          creatorUser: {
            _id: userId,
          },
        };

        const insertion = processSubmittedRecord(
          toSubmittedRecord(originalInsertRecord),
          collabText.records.map(toServerRecord),
          {
            revision: collabText.headText.revision,
            text: collabText.headText.changeset,
          }
        );

        const processedInsertRecord: CollabRecordSchema = createCollabRecord({
          ...toMongoRecord(insertion.record, originalInsertRecord),
          collabTextId: noteId,
        });

        if (insertion.type === 'new') {
          // Compose tailText, deleting older records

          let newTailText:
            | {
                revision: number;
                changeset: Changeset;
              }
            | undefined;
          if (noteForTailText?.collabText) {
            const newTailRecord = composeNewTail(
              {
                revision: noteForTailText.collabText.tailText.revision,
                text: noteForTailText.collabText.tailText.changeset,
              },
              noteForTailText.collabText.records.map(toServerForTailRecord)
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
              headText: {
                revision: insertion.headRecord.revision,
                changeset: insertion.headRecord.text,
              },
              tailText: newTailText,
              newRecord: processedInsertRecord,
            }),
            ...(connectionId
              ? [
                  updateOpenNoteAndPrime({
                    openCollabText: {
                      revision: processedInsertRecord.revision,
                      latestSelection: processedInsertRecord.afterSelection,
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
                headText: {
                  revision: insertion.headRecord.revision,
                  changeset: insertion.headRecord.text,
                },
                ...(newTailText && {
                  tailText: newTailText,
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
                records: [processedInsertRecord],
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
                        records: array(CollabRecordSchema),
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
