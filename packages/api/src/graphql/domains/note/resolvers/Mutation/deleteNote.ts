import { ObjectId } from 'mongodb';

import { WithRequired } from '../../../../../../../utils/src/types';

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
          createDeleteNotePayload(noteId, noteUser._id, true),
          ctx
        )
      )
    );

    return createDeleteNotePayload(noteId, currentUserId, true);
  } else {
    //unlinked_target_user
    await Promise.all(
      note.users.map((noteUser) =>
        publishSignedInUserMutation(
          noteUser._id,
          createDeleteNotePayload(noteId, targetUserId, false),
          ctx
        )
      )
    );

    return createDeleteNotePayload(noteId, targetUserId, false);
  }
};

function createDeleteNotePayload(
  noteId: ObjectId,
  userId: ObjectId,
  isNoteDeleted: boolean
): WithRequired<DeleteNotePayload, '__typename'> {
  return {
    __typename: 'DeleteNotePayload',
    noteId: isNoteDeleted ? noteId : null,
    userNoteLinkId: UserNoteLink_id(noteId, userId),
  };
}
