import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { ErrorWithData } from '~utils/logger';

import { DeepQueryResult } from '../../../../mongodb/query/query';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteQueryMapper } from '../../../note/mongo-query-mapper/note';
import { publishNoteUpdated } from '../../../note/resolvers/Subscription/noteUpdated';

import type { MutationResolvers } from './../../../types.generated';

export const deleteNoteSharing: NonNullable<
  MutationResolvers['deleteNoteSharing']
> = async (_parent, { input: { contentId: notePublicId } }, ctx) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  // TODO use loader
  const note = (await mongodb.collections.notes.findOne(
    {
      'userNotes.userId': currentUserId,
      publicId: notePublicId,
    },
    {
      projection: {
        _id: 1,
        ownerId: 1,
        userNotes: 1,
        shareNoteLinks: 1,
      },
    }
  )) as DeepQueryResult<NoteSchema> | null | undefined;

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

  const ownerId = note.ownerId;
  if (!ownerId) {
    throw new ErrorWithData(`Expected Note.ownerId to be defined`, {
      userId: currentUserId,
      notePublicId,
      note,
    });
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
