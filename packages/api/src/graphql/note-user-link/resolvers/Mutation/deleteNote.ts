import { ObjectId } from 'mongodb';

import { isDefined } from '~utils/type-guards/is-defined';

import { MongoQueryFn } from '../../../../mongodb/query/query';
import { QueryableNote } from '../../../../mongodb/schema/note/query/queryable-note';
import { getNotesArrayPath } from '../../../../mongodb/schema/user/user';
import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteCategory, type MutationResolvers } from '../../../types.generated';
import { throwNoteNotFound } from '../../utils/note-errors';
import { findNoteUser, findOldestNoteUser } from '../../utils/user-note';
import { publishNoteDeleted } from '../Subscription/noteEvents';
import { Note_id } from '../Note';

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  { input: { noteId } },
  ctx
) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const note = await mongodb.loaders.note.load({
    id: {
      userId: currentUserId,
      noteId,
    },
    query: {
      _id: 1,
      users: {
        _id: 1,
        createdAt: 1,
        categoryName: 1,
      },
    },
  });

  const noteUsers = note?.users ?? [];
  const noteUser = findNoteUser(currentUserId, note);
  if (!note?._id || !noteUser) {
    throwNoteNotFound(noteId);
  }

  const oldestNoteUser = findOldestNoteUser(note);

  let publishToUsers: ObjectId[] = [];

  const isCurrentUserOldest = currentUserId.equals(oldestNoteUser?._id);
  if (isCurrentUserOldest) {
    // Delete note completely
    publishToUsers = noteUsers.map((noteUser) => noteUser._id).filter(isDefined);
    await mongodb.client.withSession((session) =>
      session.withTransaction(async (session) => {
        await mongodb.collections.notes.deleteOne(
          {
            _id: noteId,
          },
          { session }
        );
        await mongodb.collections.users.bulkWrite(
          noteUsers.map((noteUser) => ({
            updateOne: {
              filter: {
                _id: noteUser._id,
              },
              update: {
                $pull: {
                  [getNotesArrayPath(noteUser.categoryName ?? NoteCategory.DEFAULT)]:
                    note._id,
                },
              },
            },
          })),
          { session }
        );
      })
    );
  } else {
    // Remove user entry from note (unlinked)
    // Publish deletion only to current user
    publishToUsers = [currentUserId];
    await mongodb.client.withSession((session) =>
      session.withTransaction(async (session) => {
        await mongodb.collections.notes.updateOne(
          {
            _id: note._id,
          },
          {
            $pull: {
              users: {
                _id: currentUserId,
              },
            },
          },
          {
            session,
          }
        );
        await mongodb.collections.users.updateOne(
          {
            _id: currentUserId,
          },
          {
            $pull: {
              [getNotesArrayPath(noteUser.categoryName ?? NoteCategory.DEFAULT)]:
                note._id,
            },
          },
          { session }
        );
      })
    );
  }

  const noteQuery: MongoQueryFn<QueryableNote> = () => note;

  // Subscription
  await Promise.all(
    publishToUsers.map((userId) =>
      publishNoteDeleted(
        userId,
        {
          note: {
            id: Note_id({
              userId,
              query: noteQuery,
            }),
          },
        },
        ctx
      )
    )
  );

  // Response
  return {
    note: {
      id: Note_id({
        userId: currentUserId,
        query: noteQuery,
      }),
    },
  };
};
