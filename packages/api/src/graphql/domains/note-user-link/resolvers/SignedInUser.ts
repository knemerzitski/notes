import { ObjectId } from 'mongodb';

import { NoteUnauthorizedUserError } from '../../../errors/note';

import type { SignedInUserResolvers } from './../../types.generated';

export const SignedInUser: Pick<SignedInUserResolvers, 'noteLink'> = {
  noteLink: (parent, arg, ctx) => {
    const {
      auth: {
        session: { userId: currentUserId },
      },
    } = parent;

    const { by } = arg;
    const { mongoDB } = ctx;

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
  },
};
