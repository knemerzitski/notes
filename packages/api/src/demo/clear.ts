import { MongoClient, WithId } from 'mongodb';
import { CollectionName } from '../mongodb/collection-names';
import { MongoDBCollections } from '../mongodb/collections';
import { TransactionContext, withTransaction } from '../mongodb/utils/with-transaction';

export async function clear(mongoDB: {
  runSingleOperation?: TransactionContext['runSingleOperation'];
  client: MongoClient;
  collections: Pick<
    MongoDBCollections,
    CollectionName.USERS | CollectionName.NOTES | CollectionName.COLLAB_RECORDS
  >;
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  // Find demo user ids
  const demoUsers = await runSingleOperation((session) =>
    mongoDB.collections.users
      .find<WithId<{}>>(
        {
          demo: {
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
    mongoDB.collections.notes
      .find<WithId<{}>>(
        {
          $or: [
            {
              demo: {
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
      mongoDB.collections.users.deleteMany(
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
      mongoDB.collections.notes.deleteMany(
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
      mongoDB.collections.collabRecords.deleteMany(
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
