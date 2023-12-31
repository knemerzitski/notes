import { GraphQLError } from 'graphql';

import type { MutationResolvers } from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';

export const deleteUserNote: NonNullable<MutationResolvers['deleteUserNote']> = async (
  _parent,
  { input: { id: notePublicId } },
  ctx
) => {
  const {
    auth,
    mongoose: { model, connection },
  } = ctx;
  assertAuthenticated(auth);

  // Ensure current user has access to this note
  const userNote = await model.UserNote.findOne(
    {
      userId: auth.session.user._id._id,
      notePublicId,
    },
    {
      userId: 1,
      _id: 1,
    }
  ).lean();
  if (!userNote) {
    throw new GraphQLError('Note not found.', {
      extensions: {
        code: 'NOT_FOUND',
      },
    });
  }

  // Is current user owner of the note?
  const note = await model.Note.findOne(
    {
      publicId: notePublicId,
    },
    {
      ownerId: 1,
    }
  ).lean();

  if (!note) {
    return {
      deleted: true,
    };
  }
  const isCurrentUserOwner = note.ownerId.equals(userNote.userId);

  if (isCurrentUserOwner) {
    // Delete note completely
    const affectedUserNotes = await model.UserNote.find(
      {
        notePublicId,
      },
      {
        userId: 1,
        _id: 1,
      }
    ).lean();

    await connection.transaction(async (session) => {
      const deleteNotePromise = model.Note.deleteOne(
        {
          publicId: notePublicId,
        },
        { session }
      );

      const deletedUserNotesPromise = model.UserNote.deleteMany(
        {
          notePublicId,
        },
        {
          session,
        }
      );

      const updateUsersPromise = model.User.bulkWrite(
        affectedUserNotes.map((userNote) => {
          return {
            updateOne: {
              filter: {
                _id: userNote.userId,
              },
              update: {
                $pull: {
                  'notes.category.default.order': userNote._id,
                },
              },
            },
          };
        }),
        {
          session,
        }
      );

      await Promise.all([deleteNotePromise, deletedUserNotesPromise, updateUsersPromise]);
    });

    return { deleted: true };
  } else {
    // Unlink note for current user
    await connection.transaction(async (session) => {
      const deletedUserNotesPromise = model.UserNote.deleteOne(
        {
          _id: userNote._id,
          notePublicId,
        },
        {
          session,
        }
      );

      const updateUserPromise = model.User.updateOne(
        {
          _id: userNote.userId,
        },
        {
          $pull: {
            'notes.category.default.order': userNote._id,
          },
        },
        {
          session,
        }
      );

      await Promise.all([deletedUserNotesPromise, updateUserPromise]);
    });
  }

  return { deleted: true };
};
