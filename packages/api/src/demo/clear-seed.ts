import { MongoClient, WithId } from 'mongodb';

import { CollectionName } from '../mongodb/collection-names';
import { MongoDBCollections } from '../mongodb/collections';
import { TransactionContext } from '../mongodb/utils/with-transaction';

/**
 * Delete all demo users and notes from database
 */
export async function clearSeed(mongoContext: {
  runSingleOperation?: TransactionContext['runSingleOperation'];
  client: MongoClient;
  collections: Pick<
    MongoDBCollections,
    CollectionName.USERS | CollectionName.NOTES | CollectionName.COLLAB_RECORDS
  >;
}) {
  const runSingleOperation = mongoContext.runSingleOperation ?? ((run) => run());

  // Find demo user ids
  const demoUsers = await runSingleOperation((session) =>
    mongoContext.collections.users
      .find<WithId<object>>(
        {
          demoId: {
            $exists: true,
          },
        },
        {
          projection: {
            _id: 1,
          },
          session,
        }
      )
      .toArray()
  );

  const demoUserIds = demoUsers.map((u) => u._id);

  // Find all note ids where demo field is present or note is owned by demo user
  const demoAffectedNotes = await runSingleOperation((session) =>
    mongoContext.collections.notes
      .find<WithId<object>>(
        {
          $or: [
            {
              demoId: {
                $exists: true,
              },
            },
            {
              users: {
                _id: {
                  in: demoUserIds,
                },
                isOwner: true,
              },
            },
          ],
        },
        {
          projection: {
            _id: 1,
          },
          session,
        }
      )
      .toArray()
  );

  const demoNoteIds = demoAffectedNotes.map((n) => n._id);

  // Delete all users and notes with records at once
  await Promise.all([
    runSingleOperation((session) =>
      mongoContext.collections.users.deleteMany(
        {
          _id: {
            $in: demoUserIds,
          },
        },
        {
          session,
        }
      )
    ),
    runSingleOperation((session) =>
      mongoContext.collections.notes.deleteMany(
        {
          _id: {
            $in: demoNoteIds,
          },
        },
        {
          session,
        }
      )
    ),
    runSingleOperation((session) =>
      mongoContext.collections.collabRecords.deleteMany(
        {
          collabTextid: {
            $in: demoNoteIds,
          },
        },
        {
          session,
        }
      )
    ),
  ]);
}
