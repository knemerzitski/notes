import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { ErrorWithData } from '~utils/logger';

import {
  ShareNoteLinkSchema,
  shareNoteLinkDefaultValues,
} from '../../../../mongodb/schema/share-note-link/share-note-link';
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

  const userNote = await mongodb.loaders.userNote.load({
    userId: currentUserId,
    publicId: notePublicId,
    userNoteQuery: {
      _id: 1,
      readOnly: 1,
      note: {
        _id: 1,
        publicId: 1,
        ownerId: 1,
      },
      shareNoteLinks: {
        $query: {
          expireAccessCount: 1,
          expireAt: 1,
        },
      },
    },
  });

  if (!userNote._id) {
    throw new ErrorWithData(`Expected UserNote._id to be defined`, {
      userId: currentUserId,
      notePublicId,
      userNote,
    });
  }
  if (!userNote.note?._id) {
    throw new ErrorWithData(`Expected UserNote.note._id to be defined`, {
      userId: currentUserId,
      notePublicId,
      userNote,
    });
  }
  if (!userNote.note.publicId) {
    throw new ErrorWithData(`Expected UserNote.note.publicId to be defined`, {
      userId: currentUserId,
      notePublicId,
      userNote,
    });
  }
  const ownerId = userNote.note.ownerId;
  if (!ownerId) {
    throw new ErrorWithData(`Expected UserNote.note.ownerId to be defined`, {
      userId: currentUserId,
      notePublicId,
      userNote,
    });
  }

  const nowTime = Date.now();

  const hasValidShareLink = userNote.shareNoteLinks?.some(
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
    _id: new ObjectId(),
    publicId: shareNoteLinkDefaultValues.publicId(),
    sourceUserNote: {
      _id: userNote._id,
    },
    note: {
      _id: userNote.note._id,
      publicId: userNote.note.publicId,
    },
    // TODO implement permissions, expireAt, expireAccessCount
  };

  await mongodb.collections.shareNoteLinks.insertOne(shareNoteLink);

  const noteMapper = new NoteQueryMapper({
    query(query) {
      return mongodb.loaders.userNote.load({
        userId: currentUserId,
        publicId: notePublicId,
        userNoteQuery: query,
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
