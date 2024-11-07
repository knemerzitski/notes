import { ObjectId } from 'mongodb';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { NoteUnauthorizedUserError } from '../../../../errors/note';
import type { QueryResolvers } from './../../../types.generated';

export const userNoteLink: NonNullable<QueryResolvers['userNoteLink']> = (
  _parent,
  arg,
  ctx
) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.userId;

  const { by } = arg;

  let noteId: ObjectId;
  if (by.noteId) {
    noteId = by.noteId;
  } else if (by.id != null) {
    if (by.id.userId !== currentUserId) {
      throw new NoteUnauthorizedUserError(currentUserId, by.id.userId);
    }

    noteId = by.id.noteId;
  } else {
    if (by.userNoteLinkId.userId !== currentUserId) {
      throw new NoteUnauthorizedUserError(currentUserId, by.userNoteLinkId.userId);
    }

    noteId = by.userNoteLinkId.noteId;
  }

  return {
    userId: currentUserId,
    query: mongoDB.loaders.note.createQueryFn({
      userId: currentUserId,
      noteId,
    }),
  };
};
