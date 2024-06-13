import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { assertAuthenticated } from '../../../base/directives/auth';
import { publishNoteDeleted } from '../Subscription/noteDeleted';

import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { CollectionName } from '../../../../mongodb/collections';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  { input: { contentId: notePublicId } },
  ctx
) => {
  const { auth, mongodb, datasources } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  // Ensure current user has access to this note
  const userNote = await datasources.notes.getNote({
    userId: currentUserId,
    publicId: notePublicId,
    noteQuery: {
      _id: 1,
      note: {
        ownerId: 1,
      },
    },
  });

  const userNoteId = userNote._id;
  const ownerId = userNote.note?.ownerId;
  if (!userNoteId || !ownerId) {
    throw new GraphQLError(`Note '${notePublicId}' not found`, {
      extensions: {
        code: GraphQLErrorCode.NotFound,
      },
    });
  }

  const isCurrentUserOwner = ownerId.equals(currentUserId);
  if (isCurrentUserOwner) {
    // Delete note completely
    const affectedUserNotes = await mongodb.collections[CollectionName.UserNotes]
      .find<Pick<UserNoteSchema, '_id' | 'userId'>>(
        {
          'note.publicId': notePublicId,
        },
        {
          projection: {
            _id: 1,
            userId: 1,
          },
        }
      )
      .toArray();

    await mongodb.client.withSession((session) =>
      session.withTransaction((session) =>
        Promise.all([
          mongodb.collections[CollectionName.Notes].deleteOne(
            {
              publicId: notePublicId,
            },
            { session }
          ),
          mongodb.collections[CollectionName.UserNotes].deleteMany(
            {
              'note.publicId': notePublicId,
            },
            { session }
          ),
          mongodb.collections[CollectionName.Users].bulkWrite(
            affectedUserNotes.map((userNote) => ({
              updateOne: {
                filter: {
                  _id: userNote.userId,
                },
                update: {
                  $pull: {
                    'notes.category.default.order': userNote._id,
                  },
                },
              },
            })),
            { session }
          ),
          mongodb.collections[CollectionName.ShareNoteLinks].bulkWrite(
            affectedUserNotes.map((userNote) => ({
              deleteOne: {
                filter: {
                  'sourceUserNote.id': userNote._id,
                },
              },
            })),
            { session }
          ),
        ])
      )
    );
  } else {
    // Unlink note for current user
    await mongodb.client.withSession((session) =>
      session.withTransaction((session) =>
        Promise.all([
          mongodb.collections[CollectionName.UserNotes].deleteOne(
            {
              _id: userNote._id,
              'note.publicId': notePublicId,
            },
            { session }
          ),
          mongodb.collections[CollectionName.Users].updateOne(
            {
              _id: currentUserId,
            },
            {
              $pull: {
                'notes.category.default.order': userNote._id,
              },
            },
            { session }
          ),
        ])
      )
    );
  }

  const payload: ResolversTypes['DeleteNotePayload'] &
    ResolversTypes['NoteDeletedPayload'] = {
    contentId: notePublicId,
    deleted: true,
  };

  await publishNoteDeleted(ctx, ownerId, payload);

  return payload;
};
