import { AnyBulkWriteOperation, MongoClient, ObjectId } from 'mongodb';
import { notesArrayPath } from '../user/utils/notes-array-path';
import { CollectionName, MongoDBCollections } from '../../collections';
import { DBUserSchema } from '../../schema/user';
import { DBNoteSchema, NoteSchema } from '../../schema/note';
import { Logger } from '~utils/logging';
import { QueryDeep, QueryResultDeep } from '../../query/query';
import { withTransaction } from '../../utils/with-transaction';

type IdPullsRecord = Record<string, { id: ObjectId; pullIds: ObjectId[] }>;

interface StatsInfo {
  processedCount: number;
  processedCountSinceLastWrite: number;
  dbStats: {
    [CollectionName.USERS]: {
      calls: number;
      notesUnlinkedCount: number;
    };
    [CollectionName.NOTES]: {
      calls: number;
      deletedCount: number;
      usersUnlinkedCount: number;
    };
  };
  status: 'in_progress' | 'interrupted' | 'done';
}

const noteProjection = {
  _id: 1,
  users: {
    _id: 1,
    isOwner: 1,
    trashed: {
      expireAt: 1,
    },
  },
} as const satisfies QueryDeep<DBNoteSchema>;

type ProjectedNote = QueryResultDeep<DBNoteSchema, typeof noteProjection>;

export async function batchDeleteExpiredNotes({
  mongoDB,
  trashCategoryName,
  batchSize = 1000,
  writeSize = batchSize,
  maxConcurrentTransactions = 1,
  onStatus,
  logger,
}: {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  /**
   * User notes array trash category name
   */
  trashCategoryName: string;
  /**
   * How many documents are queried at once
   * @default 1000
   */
  batchSize?: number;
  /**
   * How many documents are processed until bulkWrite calls are sent to database in a single transaction
   * @default batchSize
   */
  writeSize?: number;
  /**
   * Max concurrent transactions
   * @default 1
   */
  maxConcurrentTransactions?: number;
  onStatus?: (info: Readonly<StatsInfo>) =>
    | {
        signal: 'proceed';
        newBatchSize?: number;
        newWriteSize?: number;
      }
    | {
        signal: 'interrupt';
      }
    | void;
  logger?: Logger;
  /**
   * Do no throw error during batch, only works if logger is defined
   * @default false
   */
  silentErrors?: boolean;
}) {
  const currentDate = new Date();

  const notesCursor = mongoDB.collections.notes.find(
    {
      'users.trashed.expireAt': {
        $lte: currentDate,
      },
    },
    {
      projection: noteProjection,
      batchSize,
    }
  );

  let note_deleteIds: ObjectId[] = [];
  let user_pullNoteIdsByUserId: IdPullsRecord = {};
  let note_pullUserIdsByNoteId: IdPullsRecord = {};
  let countUntilWrite = writeSize;
  let nextPromiseId = 0;
  let ongoingCommands: { id: number; promise: Promise<number> }[] = [];

  const statsInfo: StatsInfo = {
    status: 'in_progress',
    processedCount: 0,
    processedCountSinceLastWrite: 0,
    dbStats: {
      [CollectionName.USERS]: {
        // 1 from initial query above
        calls: 1,
        notesUnlinkedCount: 0,
      },
      [CollectionName.NOTES]: {
        calls: 0,
        deletedCount: 0,
        usersUnlinkedCount: 0,
      },
    },
  };

  function pushToPullIdsRecord(id: ObjectId, pullId: ObjectId, target: IdPullsRecord) {
    const idStr = id.toString();
    let pullNoteIds = target[idStr];
    if (!pullNoteIds) {
      pullNoteIds = {
        id,
        pullIds: [],
      };
      target[idStr] = pullNoteIds;
    }
    pullNoteIds.pullIds.push(pullId);
  }

  function cachedToBulkWriteInput() {
    const noteBulkWrites: AnyBulkWriteOperation<DBNoteSchema>[] = [
      ...(note_deleteIds.length > 0
        ? [
            {
              deleteMany: {
                filter: {
                  _id: {
                    $in: note_deleteIds,
                  },
                },
              },
            },
          ]
        : []),
      ...Object.values(note_pullUserIdsByNoteId).map(({ id, pullIds }) => ({
        updateOne: {
          filter: {
            _id: id,
          },
          update: {
            $pull: {
              users: {
                _id: {
                  $in: pullIds,
                },
              },
            },
          },
        },
      })),
    ];

    const userBulkWrites: AnyBulkWriteOperation<DBUserSchema>[] = Object.values(
      user_pullNoteIdsByUserId
    ).map(({ id, pullIds }) => ({
      updateOne: {
        filter: {
          _id: id,
        },
        update: {
          $pullAll: {
            [notesArrayPath(trashCategoryName)]: pullIds,
          },
        },
      },
    }));

    const users_notesUnlinkedCount = Object.values(note_pullUserIdsByNoteId).reduce(
      (a, b) => a + b.pullIds.length,
      0
    );

    const notes_deletedCount = note_deleteIds.length;
    const notes_usersUnlinkedCount = Object.values(note_pullUserIdsByNoteId).reduce(
      (a, b) => a + b.pullIds.length,
      0
    );

    // Reset cached values ready for next batch
    note_deleteIds = [];
    user_pullNoteIdsByUserId = {};
    note_pullUserIdsByNoteId = {};
    countUntilWrite = writeSize;

    return {
      noteBulkWrites,
      userBulkWrites,
      updateStats: (info: StatsInfo) => {
        info.dbStats[CollectionName.USERS].notesUnlinkedCount += users_notesUnlinkedCount;

        info.dbStats[CollectionName.NOTES].deletedCount += notes_deletedCount;
        info.dbStats[CollectionName.NOTES].usersUnlinkedCount += notes_usersUnlinkedCount;
      },
    };
  }

  async function sendBulkWriteCommands({
    noteBulkWrites,
    userBulkWrites,
    updateStats,
  }: ReturnType<typeof cachedToBulkWriteInput>) {
    await withTransaction(mongoDB.client, async ({ runSingleOperation }) => {
      await Promise.all([
        noteBulkWrites.length > 0 &&
          runSingleOperation((session) => {
            return mongoDB.collections.notes.bulkWrite(noteBulkWrites, {
              session,
              ordered: false,
            });
          }),
        userBulkWrites.length > 0 &&
          runSingleOperation((session) =>
            mongoDB.collections.users.bulkWrite(userBulkWrites, {
              session,
              ordered: false,
            })
          ),
      ]);
      if (noteBulkWrites.length > 0) {
        statsInfo.dbStats[CollectionName.NOTES].calls++;
      }
      if (userBulkWrites.length > 0) {
        statsInfo.dbStats[CollectionName.USERS].calls++;
      }
      updateStats(statsInfo);
    });
  }

  async function startBulkWrite() {
    const input = cachedToBulkWriteInput();
    if (ongoingCommands.length >= maxConcurrentTransactions) {
      const promiseId = await Promise.race(ongoingCommands.map((val) => val.promise));
      ongoingCommands = ongoingCommands.filter(({ id }) => id !== promiseId);
    }
    const id = nextPromiseId++;
    ongoingCommands.push({
      id,
      promise: sendBulkWriteCommands(input).then(() => id),
    });
  }

  for await (const rawNote of notesCursor) {
    const [error, untypedNote] = NoteSchema.validate(rawNote, {
      coerce: true,
      validation: noteProjection,
    });

    if (error) {
      if (!logger) {
        throw error;
      } else {
        logger.error('db note validation error', {
          projection: noteProjection,
          error,
        });
      }

      continue;
    }

    const note: ProjectedNote = untypedNote;

    const calc = calcNoteDeletion(note, currentDate);

    if (calc.type === 'delete_completely') {
      note_deleteIds.push(note._id);
      for (const noteUser of note.users) {
        // Pull note from user
        pushToPullIdsRecord(noteUser._id, note._id, user_pullNoteIdsByUserId);
      }
    } else {
      for (const noteUser of calc.noteUsers) {
        // Pull note from user
        pushToPullIdsRecord(noteUser._id, note._id, user_pullNoteIdsByUserId);
        // Pull user from note
        pushToPullIdsRecord(note._id, noteUser._id, note_pullUserIdsByNoteId);
      }
    }

    statsInfo.processedCountSinceLastWrite++;
    statsInfo.processedCount++;

    if (countUntilWrite-- <= 0) {
      await startBulkWrite();

      if (onStatus) {
        const statusResult = onStatus(statsInfo);
        if (statusResult) {
          if (statusResult.signal === 'interrupt') {
            statsInfo.status = 'interrupted';
            logger?.error('interrupted', {
              info: statsInfo,
            });
            break;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          } else if (statusResult.signal === 'proceed') {
            batchSize = statusResult.newBatchSize ?? batchSize;
            writeSize = statusResult.newWriteSize ?? writeSize;
            // ok
          }
        }
      }

      statsInfo.processedCountSinceLastWrite = 0;
    }
  }

  await startBulkWrite();

  // Wait for all promises to be done
  await Promise.all(ongoingCommands.map((cmd) => cmd.promise));

  if (statsInfo.status === 'in_progress') {
    statsInfo.status = 'done';
  }
  if (onStatus) {
    onStatus(statsInfo);
  }
}

function calcNoteDeletion(note: ProjectedNote, currentDate: Date) {
  let ownersCount = 0;
  let ownersDeleteCount = 0;
  const expiredNoteUsers = [];

  for (const noteUser of note.users) {
    const isOwner = noteUser.isOwner;
    if (isOwner) {
      ownersCount++;
    }

    // Is trashed
    if (!noteUser.trashed) {
      continue;
    }

    // Is expired
    const expireAt = noteUser.trashed.expireAt;
    if (currentDate < expireAt) {
      continue;
    }
    expiredNoteUsers.push(noteUser);

    if (isOwner) {
      ownersDeleteCount++;
    }
  }

  const allOwnersHaveExpiredNote = ownersCount > 0 && ownersCount === ownersDeleteCount;
  const isDeleteCompletely = allOwnersHaveExpiredNote;

  if (isDeleteCompletely) {
    return {
      type: 'delete_completely' as const,
    };
  } else {
    return {
      type: 'unlink_users' as const,
      noteUsers: expiredNoteUsers,
    };
  }
}
