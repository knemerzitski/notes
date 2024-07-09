import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { CollectionName } from '../../../../mongodb/collections';
import { getNotesArrayPath } from '../../../../mongodb/schema/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  NoteCategory,
  type MutationResolvers,
  type ResolversTypes,
} from '../../../types.generated';
import { publishNoteDeleted } from '../Subscription/noteDeleted';

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
        code: GraphQLErrorCode.NOT_FOUND,
      },
    });
  }

  const isCurrentUserOwner = ownerId.equals(currentUserId);
  if (isCurrentUserOwner) {
    // Delete note completely
    const affectedUserNotes = await mongodb.collections[CollectionName.USER_NOTES]
      .find<
        Pick<UserNoteSchema, '_id' | 'userId'> & {
          category?: Pick<NonNullable<UserNoteSchema['category']>, 'name'>;
        }
      >(
        {
          'note.publicId': notePublicId,
        },
        {
          projection: {
            _id: 1,
            userId: 1,
            'category.name': 1,
          },
        }
      )
      .toArray();

    await mongodb.client.withSession((session) =>
      session.withTransaction((session) =>
        Promise.all([
          mongodb.collections[CollectionName.NOTES].deleteOne(
            {
              publicId: notePublicId,
            },
            { session }
          ),
          mongodb.collections[CollectionName.USER_NOTES].deleteMany(
            {
              'note.publicId': notePublicId,
            },
            { session }
          ),
          mongodb.collections[CollectionName.USERS].bulkWrite(
            affectedUserNotes.map((userNote) => ({
              updateOne: {
                filter: {
                  _id: userNote.userId,
                },
                update: {
                  $pull: {
                    [getNotesArrayPath(userNote.category?.name ?? NoteCategory.DEFAULT)]:
                      userNote._id,
                  },
                },
              },
            })),
            { session }
          ),
          mongodb.collections[CollectionName.SHARE_NOTE_LINKS].bulkWrite(
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
          mongodb.collections[CollectionName.USER_NOTES].deleteOne(
            {
              _id: userNote._id,
              'note.publicId': notePublicId,
            },
            { session }
          ),
          mongodb.collections[CollectionName.USERS].updateOne(
            {
              _id: currentUserId,
            },
            {
              $pull: {
                [getNotesArrayPath(userNote.category?.name ?? NoteCategory.DEFAULT)]:
                  userNote._id,
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

  if (isCurrentUserOwner) {
    await publishNoteDeleted(ctx, ownerId, payload);
  }

  return payload;
};
