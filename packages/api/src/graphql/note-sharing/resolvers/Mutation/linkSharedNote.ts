import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { ErrorWithData } from '~utils/logger';

import { DeepQueryResult } from '../../../../mongodb/query/query';
import { ShareNoteLinkSchema } from '../../../../mongodb/schema/share-note-link/share-note-link';
import { getNotesArrayPath } from '../../../../mongodb/schema/user/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note/user-note';
import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteQueryMapper } from '../../../note/mongo-query-mapper/note';
import { publishNoteCreated } from '../../../note/resolvers/Subscription/noteCreated';

import {
  NoteCategory,
  type MutationResolvers,
  type ResolversTypes,
} from './../../../types.generated';

export const linkSharedNote: NonNullable<MutationResolvers['linkSharedNote']> = async (
  _parent,
  { input: { shareId: shareNoteLinkPublicId } },
  ctx
) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const shareNoteLinks = await mongodb.collections.shareNoteLinks
    .aggregate<
      DeepQueryResult<
        Pick<ShareNoteLinkSchema, 'note'> & {
          lookupUserNote: {
            _id: ObjectId;
          };
        }
      >
    >([
      {
        $match: {
          publicId: shareNoteLinkPublicId,
        },
      },
      // Check if UserNote for currentUserId already exists
      {
        $lookup: {
          from: mongodb.collections.userNotes.collectionName,
          foreignField: 'note.publicId',
          localField: 'note.publicId',
          as: 'lookupUserNote',
          pipeline: [
            {
              $match: {
                userId: currentUserId,
              },
            },
            {
              $project: {
                _id: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          lookupUserNote: {
            $arrayElemAt: ['$lookupUserNote', 0],
          },
          note: 1,
        },
      },
    ])
    .toArray();
  // TODO implement permissions and expiration

  const shareNoteLink = shareNoteLinks[0];

  if (!shareNoteLink) {
    throw new GraphQLError(`Shared note '${shareNoteLinkPublicId}' not found`, {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
      },
    });
  }

  const existingUserNoteId = shareNoteLink.lookupUserNote?._id;

  if (!shareNoteLink.note?._id) {
    throw new ErrorWithData(`Expected ShareNoteLink.note.id to be defined`, {
      userId: currentUserId,
      shareNoteLinkPublicId,
      shareNoteLink,
    });
  }
  if (!shareNoteLink.note.publicId) {
    throw new ErrorWithData(`Expected ShareNoteLink.note.publicId to be defined`, {
      userId: currentUserId,
      shareNoteLinkPublicId,
      shareNoteLink,
    });
  }
  // Return early since UserNote already exists
  if (existingUserNoteId) {
    const publicId = shareNoteLink.note.publicId;
    return {
      note: new NoteQueryMapper({
        query(query) {
          return mongodb.loaders.userNote.load({
            userId: currentUserId,
            publicId,
            userNoteQuery: query,
          });
        },
      }),
    };
  }

  const sharedUserNote: UserNoteSchema = {
    _id: new ObjectId(),
    userId: currentUserId,
    note: {
      _id: shareNoteLink.note._id,
      publicId: shareNoteLink.note.publicId, // this must be unique within (userId, publicId)
    },
  };

  await mongodb.client.withSession((session) =>
    session.withTransaction((session) => {
      return Promise.all([
        mongodb.collections.users.updateOne(
          {
            _id: currentUserId,
          },
          {
            $push: {
              [getNotesArrayPath(NoteCategory.DEFAULT)]: sharedUserNote._id,
            },
          },
          { session }
        ),
        mongodb.collections.userNotes.insertOne(sharedUserNote),
      ]);
    })
  );

  const noteQueryMapper = new NoteQueryMapper({
    query(query) {
      return mongodb.loaders.userNote.load({
        userId: currentUserId,
        publicId: sharedUserNote.note.publicId,
        userNoteQuery: query,
      });
    },
  });

  const payload: ResolversTypes['CreateNotePayload'] &
    ResolversTypes['NoteCreatedPayload'] = {
    note: noteQueryMapper,
  };

  await publishNoteCreated(ctx, payload);

  return payload;
};
