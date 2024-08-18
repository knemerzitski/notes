import { assertAuthenticated } from '../../../base/directives/auth';

import { throwNoteNotFound } from '../../utils/note-errors';

import type { QueryResolvers } from './../../../types.generated';

export const note: NonNullable<QueryResolvers['note']> = (_parent, { noteId }, ctx) => {
  const {
    auth,
    mongodb: { loaders },
  } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  return {
    userId: currentUserId,
    query: async (query) => {
      const note = await loaders.note.load({
        id: {
          userId: currentUserId,
          noteId,
        },
        query,
      });

      if (!note) {
        throwNoteNotFound(noteId);
      }

      return note;
    },
  };
};
