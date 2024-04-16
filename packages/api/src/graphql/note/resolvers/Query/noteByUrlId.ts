import { assertAuthenticated } from '../../../base/directives/auth';

import { type QueryResolvers } from '../../../types.generated';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';

export const noteByUrlId: NonNullable<QueryResolvers['noteByUrlId']> = (
  _parent,
  { urlId: notePublicId },
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
