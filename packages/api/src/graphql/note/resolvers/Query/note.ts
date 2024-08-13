import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';

import { throwNoteNotFound } from '../../utils/note-errors';

import type { QueryResolvers } from './../../../types.generated';

export const note: NonNullable<QueryResolvers['note']> = (_parent, { noteId }, ctx) => {
  const {
    auth,
    mongodb: { loaders },
  } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  return new NoteQueryMapper(currentUserId, {
    async query(query) {
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
  });
};
