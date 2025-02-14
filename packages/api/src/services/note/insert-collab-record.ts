import { MongoClient, ObjectId } from 'mongodb';

import { ChangesetError } from '~collab/changeset';
import { SelectionRange } from '~collab/client/selection-range';
import { processRecordInsertion } from '~collab/records/process-record-insertion';

import { RevisionChangeset, ServerRevisionRecord } from '~collab/records/record';
import { RevisionRecords } from '~collab/records/revision-records';

import { CollectionName, MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { createCollabText } from '../../mongodb/models/note/create-collab-text';

import { insertRecord as model_insertRecord } from '../../mongodb/models/note/insert-record';
import { updateSetCollabText } from '../../mongodb/models/note/update-set-collab-text';
import { CollabRecordSchema } from '../../mongodb/schema/collab-record';
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

type ExistingRecord = Pick<
  CollabRecordSchema,
  'afterSelection' | 'beforeSelection' | 'changeset' | 'revision' | 'userGeneratedId'
> & {
  creatorUser: Pick<CollabRecordSchema['creatorUser'], '_id'>;
};

type InsertRecord = Omit<ExistingRecord, 'creatorUser'>;

interface InsertCollabRecordParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
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
  maxRecordsCount?: number;
}

function toInsertionRecord(
  record: MongoReadonlyDeep<ExistingRecord>
): ServerRevisionRecord {
  return {
    changeset: record.changeset,
    revision: record.revision,
    userGeneratedId: record.userGeneratedId,
    creatorUserId: objectIdToStr(record.creatorUser._id),
    beforeSelection: SelectionRange.expandSame(record.beforeSelection),
    afterSelection: SelectionRange.expandSame(record.afterSelection),
  };
}

function fromInsertionRecord(
  record: ServerRevisionRecord,
  original: MongoReadonlyDeep<ExistingRecord>
): ExistingRecord {
  return {
    changeset: record.changeset,
    revision: record.revision,
    userGeneratedId: record.userGeneratedId,
    afterSelection: record.afterSelection,
    beforeSelection: record.beforeSelection,
    creatorUser: original.creatorUser,
  };
}

export function insertCollabRecord({
  mongoDB,
  userId,
  noteId,
  insertRecord,
  maxRecordsCount,
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
                    creatorUser: {
                      _id: 1,
                    },
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
        const newCollabText = createCollabText({
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
          collabText: newCollabText,
        });

        const newRecord = newCollabText.records[0];

        mongoDB.loaders.note.prime(
          {
            id: {
              noteId,
              userId,
            },
          },
          {
            _id: noteId,
            collabText: newCollabText,
          },
          {
            valueToQueryOptions: {
              fillStruct: NoteSchema,
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
        const originalInsertRecord: MongoReadonlyDeep<ExistingRecord> = {
          ...insertRecord,
          creatorUser: {
            _id: userId,
          },
        };

        const insertion = processRecordInsertion({
          headText: collabText.headText,
          records: collabText.records.map(toInsertionRecord),
          newRecord: toInsertionRecord(originalInsertRecord),
        });

        const processedInsertRecord: CollabRecordSchema = {
          ...fromInsertionRecord(insertion.record, originalInsertRecord),
          createdAt: new Date(),
        };

        if (insertion.type === 'new') {
          // Compose tailText, deleting older records
          let newComposedTail:
            | { tailText: RevisionChangeset; recordsCount: number }
            | undefined;
          const collabTextForTailCompose = noteForTailText?.collabText;
          if (collabTextForTailCompose) {
            const tailRevisionRecords = new RevisionRecords({
              tailText: collabTextForTailCompose.tailText,
              records: collabTextForTailCompose.records,
            });

            const beforeTailRevision = tailRevisionRecords.tailRevision;

            tailRevisionRecords.mergeToTail(tailRevisionRecords.items.length);
            const newTailText = tailRevisionRecords.tailText;

            if (newTailText.revision > beforeTailRevision) {
              newComposedTail = {
                tailText: newTailText,
                recordsCount: insertion.headText.revision - newTailText.revision,
              };
            }
          }

          await model_insertRecord({
            mongoDB: {
              runSingleOperation,
              collections: mongoDB.collections,
            },
            noteId,
            headText: insertion.headText,
            composedTail: newComposedTail,
            newRecord: processedInsertRecord,
          });

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
                headText: insertion.headText,
                ...(newComposedTail && {
                  tailText: newComposedTail.tailText,
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
                fillStruct: NoteSchema,
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
        if (err instanceof ChangesetError) {
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
