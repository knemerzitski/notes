import { ErrorWithData } from '~utils/logger';

import { CollectionName } from '../../../../mongodb/collections';
import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteQueryMapper } from '../../../note/mongo-query-mapper/note';
import { publishNoteUpdated } from '../../../note/resolvers/Subscription/noteUpdated';

import type { MutationResolvers } from './../../../types.generated';

export const deleteNoteSharing: NonNullable<
  MutationResolvers['deleteNoteSharing']
> = async (_parent, { input: { contentId: notePublicId } }, ctx) => {
  const { auth, datasources, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const userNote = await datasources.notes.getNote({
    userId: currentUserId,
    publicId: notePublicId,
    noteQuery: {
      _id: 1,
      note: {
        ownerId: 1,
      },
      shareNoteLinks: {
        $query: {
          _id: 1,
        },
      },
    },
  });

  const noteMapper = new NoteQueryMapper({
    queryDocument(query) {
      return datasources.notes.getNote({
        userId: currentUserId,
        publicId: notePublicId,
        noteQuery: query,
      });
    },
  });
  // Sharing is deleted, set to null
  noteMapper.sharing = () => Promise.resolve(null);

  if (!userNote.shareNoteLinks || userNote.shareNoteLinks.length === 0) {
    return {
      note: noteMapper,
    };
  }

  if (!userNote._id) {
    throw new ErrorWithData(`Expected UserNote._id to be defined`, {
      userId: currentUserId,
      notePublicId,
      userNote,
    });
  }
  const ownerId = userNote.note?.ownerId;
  if (!ownerId) {
    throw new ErrorWithData(`Expected UserNote.note.ownerId to be defined`, {
      userId: currentUserId,
      notePublicId,
      userNote,
    });
  }

  await mongodb.collections[CollectionName.ShareNoteLinks].deleteMany({
    'sourceUserNote.id': userNote._id,
  });

  await publishNoteUpdated(ctx, ownerId, {
    contentId: notePublicId,
    patch: {
      id: () => noteMapper.id(),
      sharing: {
        // All note sharing entries are deleted
        deleted: true,
      },
    },
  });

  return {
    note: noteMapper,
  };
};
