import { ObjectId } from 'mongodb';
import { CollectionName } from '../../../../mongodb/collections';
import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteQueryMapper } from '../../../note/mongo-query-mapper/note';
import type { MutationResolvers, ResolversTypes } from './../../../types.generated';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { ErrorWithData } from '~utils/logger';
import { GraphQLError } from 'graphql';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { publishNoteCreated } from '../../../note/resolvers/Subscription/noteCreated';
import { ShareNoteLinkSchema } from '../../../../mongodb/schema/share-note-link';
import { DeepQueryResponse } from '../../../../mongodb/query-builder';
import mapObject from 'map-obj';
export const linkSharedNote: NonNullable<MutationResolvers['linkSharedNote']> = async (
  _parent,
  { input: { shareId: shareNoteLinkPublicId } },
  ctx
) => {
  const { auth, datasources, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const shareNoteLinks = await mongodb.collections[CollectionName.ShareNoteLinks]
    .aggregate<
      DeepQueryResponse<
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
          from: mongodb.collections[CollectionName.UserNotes].collectionName,
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
    throw new GraphQLError(`A note is not shared by '${shareNoteLinkPublicId}'`, {
      extensions: {
        code: GraphQLErrorCode.NotFound,
      },
    });
  }

  const existingUserNoteId = shareNoteLink.lookupUserNote?._id;

  if (!shareNoteLink.note?.id) {
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
  if (!shareNoteLink.note.collabTextIds) {
    throw new ErrorWithData(`Expected ShareNoteLink.note.collabTextIds to be defined`, {
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
        queryDocument(query) {
          return datasources.notes.getNote({
            userId: currentUserId,
            publicId,
            noteQuery: query,
          });
        },
      }),
    };
  }

  const sharedUserNote: UserNoteSchema = {
    _id: new ObjectId(),
    userId: currentUserId,
    note: {
      id: shareNoteLink.note.id,
      publicId: shareNoteLink.note.publicId, // this must be unique within (userId, publicId)
      collabTextIds: mapObject(shareNoteLink.note.collabTextIds, (key, id) => {
        if (!id) {
          throw new ErrorWithData(
            `Expected ShareNoteLink.note.collabText.${key}.id to be defined`,
            {
              userId: currentUserId,
              shareNoteLinkPublicId,
              shareNoteLink,
            }
          );
        }

        return [key, id];
      }),
    },
  };

  await mongodb.collections[CollectionName.UserNotes].insertOne(sharedUserNote);

  const noteQueryMapper = new NoteQueryMapper({
    queryDocument(query) {
      return datasources.notes.getNote({
        userId: currentUserId,
        publicId: sharedUserNote.note.publicId,
        noteQuery: query,
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
