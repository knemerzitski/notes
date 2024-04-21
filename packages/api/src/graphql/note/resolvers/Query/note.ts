import type { QueryResolvers } from './../../../types.generated';

import { NoteQueryMapper } from '../../mongo-query-mapper/note';
import { assertAuthenticated } from '../../../base/directives/auth';

export const note: NonNullable<QueryResolvers['note']> = (
  _parent,
  { contentId: notePublicId },
  ctx
) => {
  const { auth, datasources } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  return new NoteQueryMapper({
    queryDocument(query) {
      return datasources.notes.getNote({
        userId: currentUserId,
        publicId: notePublicId,
        noteQuery: query,
      });
    },
  });
};
