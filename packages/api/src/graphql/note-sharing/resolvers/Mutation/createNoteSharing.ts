import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { ErrorWithData } from '~utils/logger';

import {
  ShareNoteLinkSchema,
  shareNoteLinkDefaultValues,
} from '../../../../mongodb/schema/note/share-note-link';
import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteQueryMapper } from '../../../note/mongo-query-mapper/note';
import { publishNoteUpdated } from '../../../note/resolvers/Subscription/noteUpdated';

import { type MutationResolvers } from './../../../types.generated';

export const createNoteSharing: NonNullable<
  MutationResolvers['createNoteSharing']
> = async (_parent, { input: { contentId: notePublicId } }, ctx) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const note = await mongodb.loaders.note.load({
    userId: currentUserId,
    publicId: notePublicId,
    noteQuery: {
      _id: 1,
      publicId: 1,
      ownerId: 1,
      userNotes: {
        $query: {
          readOnly: 1,
        },
      },
      shareNoteLinks: {
        $query: {
          expireAccessCount: 1,
          expireAt: 1,
        },
      },
    },
  });

  // TODO create utility function to guarantee properties are defined
  if (!note._id) {
    throw new ErrorWithData(`Expected Note._id to be defined`, {
      userId: currentUserId,
      notePublicId,
      userNote: note,
    });
  }
  if (!note.publicId) {
    throw new ErrorWithData(`Expected Note.publicId to be defined`, {
      userId: currentUserId,
      notePublicId,
      userNote: note,
    });
  }
  const ownerId = note.ownerId;
  if (!ownerId) {
    throw new ErrorWithData(`Expected Note.ownerId to be defined`, {
      userId: currentUserId,
      notePublicId,
      userNote: note,
    });
  }

  const nowTime = Date.now();

  const hasValidShareLink = note.shareNoteLinks?.some(
    ({ expireAt, expireAccessCount }) => {
      let isValid = true;

      if (expireAccessCount != null) {
        isValid = expireAccessCount > 0;
      }

      if (expireAt && isValid) {
        isValid = expireAt.getTime() > nowTime;
      }

      return isValid;
    }
  );

  if (hasValidShareLink) {
    throw new GraphQLError('Note is already shared. Cannot create another link.', {
      extensions: {
        code: GraphQLErrorCode.INVALID_OPERATION,
      },
    });
  }

  const shareNoteLink: ShareNoteLinkSchema = {
    publicId: shareNoteLinkDefaultValues.publicId(),
    creatorUserId: currentUserId,
    // TODO implement permissions, expireAt, expireAccessCount
  };

  await mongodb.collections.notes.updateOne(
    {
      _id: note._id,
    },
    {
      $push: {
        shareNoteLinks: shareNoteLink,
      },
    }
  );

  const noteMapper = new NoteQueryMapper(currentUserId, {
    query(query) {
      return mongodb.loaders.note.load({
        userId: currentUserId,
        publicId: notePublicId,
        noteQuery: query,
      });
    },
  });

  // Override sharing with known value
  noteMapper.sharing = () => Promise.resolve({ id: shareNoteLink.publicId });

  await publishNoteUpdated(ctx, ownerId, {
    contentId: notePublicId,
    patch: {
      id: () => noteMapper.id(),
      sharing: noteMapper.sharing(),
    },
  });

  return {
    note: noteMapper,
  };
};
