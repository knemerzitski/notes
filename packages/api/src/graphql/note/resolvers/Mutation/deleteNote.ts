import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { getNotesArrayPath } from '../../../../mongodb/schema/user/user';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  NoteCategory,
  type MutationResolvers,
  type ResolversTypes,
} from '../../../types.generated';
import findNoteOwners from '../../utils/findNoteOwners';
import findUserNote from '../../utils/findUserNote';
import { publishNoteDeleted } from '../Subscription/noteDeleted';

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  { input: { contentId: notePublicId } },
  ctx
) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  // Ensure current user has access to this note
  const note = await mongodb.loaders.note.load({
    userId: currentUserId,
    publicId: notePublicId,
    noteQuery: {
      _id: 1,
      userNotes: {
        $query: {
          userId: 1,
          isOwner: 1,
          category: {
            name: 1,
          },
        },
      },
    },
  });

  const noteId = note._id;
  const userNotes = note.userNotes ?? [];
  const userNote = findUserNote(currentUserId, note);
  if (!noteId || !userNote) {
    throw new GraphQLError(`Note '${notePublicId}' not found`, {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
      },
    });
  }

  const isCurrentUserOwner = userNote.isOwner ?? false;
  if (isCurrentUserOwner) {
    // Delete note completely
    await mongodb.client.withSession((session) =>
      session.withTransaction((session) =>
        Promise.all([
          mongodb.collections.notes.deleteOne(
            {
              _id: noteId,
            },
            { session }
          ),
          mongodb.collections.users.bulkWrite(
            userNotes.map((userNote) => ({
              updateOne: {
                filter: {
                  _id: userNote.userId,
                },
                update: {
                  $pull: {
                    [getNotesArrayPath(userNote.category?.name ?? NoteCategory.DEFAULT)]:
                      note._id,
                  },
                },
              },
            })),
            { session }
          ),
        ])
      )
    );
  } else {
    const userNote = userNotes.find((userNote) => userNote.userId?.equals(currentUserId));
    if (!userNote) {
      throw new GraphQLError(`Note '${notePublicId}' not found`, {
        extensions: {
          code: GraphQLErrorCode.NOT_FOUND,
        },
      });
    }

    // Unlink note for current user
    await mongodb.client.withSession((session) =>
      session.withTransaction((session) =>
        Promise.all([
          mongodb.collections.notes.updateOne(
            {
              _id: note._id,
            },
            {
              $pull: {
                userNotes: {
                  userId: currentUserId,
                },
              },
            },
            {
              session,
            }
          ),
          mongodb.collections.users.updateOne(
            {
              _id: currentUserId,
            },
            {
              $pull: {
                [getNotesArrayPath(userNote.category?.name ?? NoteCategory.DEFAULT)]:
                  note._id,
              },
            },
            { session }
          ),
        ])
      )
    );
  }

  const payload: ResolversTypes['DeleteNotePayload'] &
    ResolversTypes['NoteDeletedPayload'] = {
    contentId: notePublicId,
    deleted: true,
  };

  if (isCurrentUserOwner) {
    await publishNoteDeleted(ctx, findNoteOwners(note), payload);
  }

  return payload;
};
