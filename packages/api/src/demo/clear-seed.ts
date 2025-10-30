import { MongoClient } from 'mongodb';

import { CollectionName } from '../mongodb/collection-names';
import { MongoDBCollections } from '../mongodb/collections';
import { DBNoteSchema } from '../mongodb/schema/note';
import { DBUserSchema } from '../mongodb/schema/user';
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
      .find<Pick<DBUserSchema, '_id' | 'note'>>(
        {
          demoId: {
            $exists: true,
          },
        },
        {
          projection: {
            _id: 1,
            note: 1,
          },
          session,
        }
      )
      .toArray()
  );

  const demoUserIds = demoUsers.map((u) => u._id);

  const allAffectedNoteIds = demoUsers.flatMap((user) =>
    Object.values(user.note.categories).flatMap((cat) => cat.noteIds)
  );
  const uniqueAffectedNoteIds = [
    ...new Map(allAffectedNoteIds.map((id) => [id.toString(), id])).values(),
  ];

  // Find all notes with demoId or where demoUser is in users list
  const affectedNotes = await runSingleOperation((session) =>
    mongoContext.collections.notes
      .find<
        Pick<DBNoteSchema, '_id' | 'demoId'> & {
          users: Pick<DBNoteSchema['users'][0], '_id' | 'isOwner'>[];
        }
      >(
        {
          $or: [
            {
              demoId: {
                $exists: true,
              },
            },
            {
              _id: {
                $in: uniqueAffectedNoteIds,
              },
            },
          ],
        },
        {
          projection: {
            _id: 1,
            demoId: 1,
            users: {
              _id: 1,
              isOwner: 1,
            },
          },
          session,
        }
      )
      .toArray()
  );

  type AffectedNote = (typeof affectedNotes)[0];

  function isDeletableNote(note: AffectedNote) {
    return (
      note.demoId != null ||
      note.users.some(
        (user) =>
          user.isOwner && demoUserIds.some((demoUserId) => demoUserId.equals(user._id))
      )
    );
  }

  const [deletableNotes, keepNotes] = affectedNotes.reduce<
    [AffectedNote[], AffectedNote[]]
  >(
    ([a, b], note) => {
      (isDeletableNote(note) ? a : b).push(note);
      return [a, b];
    },
    [[], []]
  );
  const deletableNoteIds = deletableNotes.map((note) => note._id);
  const keepNoteIds = keepNotes.map((note) => note._id);

  // Delete all users and notes with records at once
  await Promise.all([
    // Delete demo users
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
      mongoContext.collections.notes.bulkWrite(
        [
          // Delete demo user owned notes or with demoId
          {
            deleteMany: {
              filter: {
                _id: {
                  $in: deletableNoteIds,
                },
              },
            },
          },
          // Unlink demo users from normal notes
          {
            updateMany: {
              filter: {
                _id: {
                  $in: keepNoteIds,
                },
              },
              update: {
                $pull: {
                  users: {
                    _id: {
                      $in: demoUserIds,
                    },
                  },
                },
              },
            },
          },
        ],
        {
          session,
        }
      )
    ),
    runSingleOperation((session) =>
      mongoContext.collections.collabRecords.bulkWrite(
        [
          // Delete records of deleted notes
          {
            deleteMany: {
              filter: {
                collabTextId: {
                  $in: deletableNoteIds,
                },
              },
            },
          },
          // Replace deleted author with first note owner
          ...keepNotes.map((note) => ({
            updateMany: {
              filter: {
                collabTextId: note._id,
                authorId: {
                  $in: demoUserIds,
                },
              },
              update: {
                $set: {
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  authorId: note.users.find(
                    (user) =>
                      user.isOwner === true &&
                      !demoUserIds.some((demoUserId) => demoUserId.equals(user._id))
                  )!._id,
                },
              },
            },
          })),
        ],
        {
          session,
        }
      )
    ),
  ]);
}
