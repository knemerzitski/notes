import { ObjectId } from 'mongodb';

import { WithRequired } from '~utils/types';

import { deleteNote as service_deleteNote } from '../../../../../services/note/delete-note';
import { UserNoteLink_id } from '../../../../../services/note/user-note-link-id';
import { DeleteNotePayload, type MutationResolvers } from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  arg,
  ctx
) => {
  const { mongoDB } = ctx;
  const { input } = arg;

  const noteId = input.note.id;

  const currentUserId = input.authUser.id; // scopeUserId

  const targetUserId = input.deleteUserId ?? currentUserId;

  const { type: noteDeleteType, note } = await service_deleteNote({
    mongoDB,
    noteId,
    scopeUserId: currentUserId,
    targetUserId,
  });

  if (noteDeleteType === 'deleted_completely') {
    await Promise.all(
      note.users.map((noteUser) =>
        publishSignedInUserMutation(
          noteUser._id,
          createDeleteNoteCompletelyPayload(noteId, noteUser._id),
          ctx
        )
      )
    );

    return createDeleteNoteCompletelyPayload(noteId, currentUserId);
  } else {
    //unlinked_target_user
    await Promise.all(
      note.users.map((noteUser) =>
        publishSignedInUserMutation(
          noteUser._id,
          targetUserId.equals(noteUser._id)
            ? createUnlinkSelfUserNoteNotePayload(noteId, targetUserId)
            : createUnlinkOtherUserNoteNotePayload(noteId, targetUserId),
          ctx
        )
      )
    );

    if (targetUserId.equals(currentUserId)) {
      return createUnlinkSelfUserNoteNotePayload(noteId, targetUserId);
    } else {
      return createUnlinkOtherUserNoteNotePayload(noteId, targetUserId);
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
