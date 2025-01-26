import { ObjectId } from 'mongodb';

import { NoteUnauthorizedUserError } from '../../../../errors/note';

import type { QueryResolvers } from './../../../types.generated';

export const userNoteLink: NonNullable<QueryResolvers['userNoteLink']> = async (
  _parent,
  arg,
  ctx
) => {
  const { services, mongoDB } = ctx;
  const auth = await services.requestHeaderAuth.getAuth();

  const currentUserId = auth.session.userId;

  const { by } = arg;

  let noteId: ObjectId;
  if (by.noteId) {
    noteId = by.noteId;
  } else if (by.id != null) {
    if (!by.id.userId.equals(currentUserId)) {
      throw new NoteUnauthorizedUserError(currentUserId, by.id.userId);
    }

    noteId = by.id.noteId;
  } else {
    if (!by.userNoteLinkId.userId.equals(currentUserId)) {
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
