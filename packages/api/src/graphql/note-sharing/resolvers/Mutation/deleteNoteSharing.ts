import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteQueryMapper } from '../../../note/mongo-query-mapper/note';

import type { MutationResolvers } from './../../../types.generated';

export const deleteNoteSharing: NonNullable<
  MutationResolvers['deleteNoteSharing']
> = async (_parent, { input: { contentId: notePublicId } }, ctx) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const note = await mongodb.loaders.note.load({
    userId: currentUserId,
    publicId: notePublicId,
    noteQuery: {
      _id: 1,
      shareNoteLinks: {
        publicId: 1,
      },
    },
  });

  if (!note?._id) {
    throw new GraphQLError(`Note '${notePublicId}' not found`, {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
      },
    });
  }

  const noteMapper = new NoteQueryMapper(currentUserId, {
    query(query) {
      return mongodb.loaders.note.load({
        userId: currentUserId,
        publicId: notePublicId,
        noteQuery: query,
      });
    },
  });
  // Sharing will be deleted, set to null
  noteMapper.sharing = () => Promise.resolve(null);

  if (!note.shareNoteLinks || note.shareNoteLinks.length === 0) {
    return {
      note: noteMapper,
    };
  }

  await mongodb.collections.notes.updateOne(
    {
      _id: note._id,
    },
    {
      $unset: {
        shareNoteLinks: 1,
      },
    }
  );

  // TODO fix
  // await publishNoteUpdated(ctx, findNoteOwners(note), {
  //   contentId: notePublicId,
  //   patch: {
  //     id: () => noteMapper.id(),
  //     sharing: {
  //       // All note sharing entries are deleted
  //       deleted: true,
  //     },
  //   },
  // });

  return {
    note: noteMapper,
  };
};
