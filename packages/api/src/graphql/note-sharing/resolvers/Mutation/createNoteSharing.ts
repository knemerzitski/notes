import { GraphQLError } from 'graphql';
import mapObject from 'map-obj';
import { ObjectId } from 'mongodb';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { ErrorWithData } from '~utils/logger';

import { CollectionName } from '../../../../mongodb/collections';
import {
  ShareNoteLinkSchema,
  shareNoteLinkDefaultValues,
} from '../../../../mongodb/schema/share-note-link';
import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteQueryMapper } from '../../../note/mongo-query-mapper/note';
import { publishNoteUpdated } from '../../../note/resolvers/Subscription/noteUpdated';

import { NoteTextField, type MutationResolvers } from './../../../types.generated';

export const createNoteSharing: NonNullable<
  MutationResolvers['createNoteSharing']
> = async (_parent, { input: { contentId: notePublicId } }, ctx) => {
  const { auth, datasources, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const userNote = await datasources.notes.getNote({
    userId: currentUserId,
    publicId: notePublicId,
    noteQuery: {
      _id: 1,
      readOnly: 1,
      note: {
        id: 1,
        publicId: 1,
        ownerId: 1,
        collabTexts: mapObject(NoteTextField, (_key, value) => [
          value,
          {
            _id: 1,
          },
        ]),
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
  if (!userNote.note?.id) {
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
  if (!userNote.note.collabTexts) {
    throw new ErrorWithData(`Expected UserNote.note.collabTexts to be defined`, {
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

  const hasValidShareLink =
    userNote.shareNoteLinks &&
    userNote.shareNoteLinks.some(({ expireAt, expireAccessCount }) => {
      let isValid = true;

      if (expireAccessCount != null) {
        isValid = expireAccessCount > 0;
      }

      if (expireAt && isValid) {
        isValid = expireAt.getTime() > nowTime;
      }

      return isValid;
    });

  if (hasValidShareLink) {
    throw new GraphQLError('Note is already shared. Cannot create another link.', {
      extensions: {
        code: GraphQLErrorCode.InvalidOperation,
      },
    });
  }

  const shareNoteLink: ShareNoteLinkSchema = {
    _id: new ObjectId(),
    publicId: shareNoteLinkDefaultValues.publicId(),
    sourceUserNote: {
      id: userNote._id,
    },
    note: {
      id: userNote.note.id,
      publicId: userNote.note.publicId,
      collabTextIds: mapObject(userNote.note.collabTexts, (key, collabText) => {
        if (!collabText?._id) {
          throw new ErrorWithData(
            `Expected UserNote.note.collabText.${key}._id to be defined`,
            {
              userId: currentUserId,
              notePublicId,
              userNote,
            }
          );
        }

        return [key, collabText._id];
      }),
    },
    // TODO implement permissions, expireAt, expireAccessCount
  };

  await mongodb.collections[CollectionName.ShareNoteLinks].insertOne(shareNoteLink);

  const noteMapper = new NoteQueryMapper({
    queryDocument(query) {
      return datasources.notes.getNote({
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
