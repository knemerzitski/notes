import { GraphQLError } from 'graphql';
import { Require_id, Types } from 'mongoose';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { DBNote } from '../../../../mongoose/models/note';
import { assertAuthenticated } from '../../../base/directives/auth';
import { publishNoteDeleted } from '../Subscription/noteDeleted';

import type { MutationResolvers } from './../../../types.generated';

interface UserNoteAggregateResult {
  userId: Types.ObjectId;
  note?: Pick<DBNote, 'ownerId'>;
}

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  { input: { id: notePublicId } },
  ctx
) => {
  const {
    auth,
    mongoose: { model, connection },
  } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id._id;

  // Ensure current user has access to this note
  const [userNote] = await model.UserNote.aggregate<Require_id<UserNoteAggregateResult>>([
    {
      $match: {
        userId: currentUserId,
        notePublicId,
      },
    },
    {
      $lookup: {
        from: model.Note.collection.collectionName,
        foreignField: 'publicId',
        localField: 'notePublicId',
        as: 'note',
      },
    },
    {
      $set: {
        note: { $arrayElemAt: ['$note', 0] },
      },
    },
    {
      $project: {
        userId: 1,
        'note.ownerId': 1,
      },
    },
  ]);

  if (!userNote) {
    throw new GraphQLError('Note not found.', {
      extensions: {
        code: GraphQLErrorCode.NotFound,
      },
    });
  }

  const isCurrentUserOwner = userNote.note?.ownerId.equals(userNote.userId) ?? false;

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

  await publishNoteDeleted(ctx, {
    id: notePublicId,
  });

  return { deleted: true };
};
