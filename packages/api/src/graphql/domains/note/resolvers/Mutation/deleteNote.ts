import { DeleteNotePayload, type MutationResolvers } from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';
import { ObjectId } from 'mongodb';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { WithRequired } from '~utils/types';
import { UserNoteLink_id } from '../../../../../services/note/user-note-link-id';
import { deleteNote as service_deleteNote } from '../../../../../services/note/delete-note';

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  arg,
  ctx
) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId; // scopeUserId

  const targetUserId = input.userId ?? currentUserId;

  const { type: noteDeleteType, note } = await service_deleteNote({
    mongoDB,
    noteId: input.noteId,
    scopeUserId: currentUserId,
    targetUserId,
  });

  if (noteDeleteType === 'deleted_completely') {
    await Promise.all(
      note.users.map((noteUser) =>
        publishSignedInUserMutation(
          noteUser._id,
          createDeleteNoteCompletelyPayload(input.noteId, noteUser._id),
          ctx
        )
      )
    );

    return createDeleteNoteCompletelyPayload(input.noteId, currentUserId);
  } else {
    //unlinked_target_user
    await Promise.all(
      note.users.map((noteUser) =>
        publishSignedInUserMutation(
          noteUser._id,
          targetUserId.equals(noteUser._id)
            ? createUnlinkSelfUserNoteNotePayload(input.noteId, targetUserId)
            : createUnlinkOtherUserNoteNotePayload(input.noteId, targetUserId),
          ctx
        )
      )
    );

    if (targetUserId.equals(currentUserId)) {
      return createUnlinkSelfUserNoteNotePayload(input.noteId, targetUserId);
    } else {
      return createUnlinkOtherUserNoteNotePayload(input.noteId, targetUserId);
    }
  }
};

/**
 * Note is deleted for user
 */
function createDeleteNoteCompletelyPayload(
  noteId: ObjectId,
  userId: ObjectId
): WithRequired<DeleteNotePayload, '__typename'> {
  return {
    __typename: 'DeleteNotePayload',
    noteId,
    userNoteLinkId: UserNoteLink_id(noteId, userId),
    publicUserNoteLinkId: UserNoteLink_id(noteId, userId),
  };
}

function createUnlinkSelfUserNoteNotePayload(
  noteId: ObjectId,
  userId: ObjectId
): WithRequired<DeleteNotePayload, '__typename'> {
  return {
    __typename: 'DeleteNotePayload',
    userNoteLinkId: UserNoteLink_id(noteId, userId),
    publicUserNoteLinkId: UserNoteLink_id(noteId, userId),
  };
}

/**
 * Only other user note is deleted
 */
function createUnlinkOtherUserNoteNotePayload(
  noteId: ObjectId,
  userId: ObjectId
): WithRequired<DeleteNotePayload, '__typename'> {
  return {
    __typename: 'DeleteNotePayload',
    publicUserNoteLinkId: UserNoteLink_id(noteId, userId),
  };
}
