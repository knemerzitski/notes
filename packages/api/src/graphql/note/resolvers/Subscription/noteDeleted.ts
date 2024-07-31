import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { isAuthenticated } from '../../../auth-context';
import { assertAuthenticated } from '../../../base/directives/auth';
import { GraphQLResolversContext } from '../../../context';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';

export const noteDeleted: NonNullable<SubscriptionResolvers['noteDeleted']> = {
  subscribe: async (_parent, { input }, ctx) => {
    const {
      auth,
      mongodb: { loaders },
      subscribe,
      denySubscription,
    } = ctx;
    if (!isAuthenticated(auth)) return denySubscription();

    const notePublicId = input?.contentId;

    const currentUserId = auth.session.user._id;

    if (notePublicId) {
      // Ensure current user has access to this note
      const userNote = await loaders.note.load({
        userId: currentUserId,
        publicId: notePublicId,
        noteQuery: {
          _id: 1,
        },
      });

      if (!userNote._id) {
        throw new GraphQLError(`Note '${notePublicId}' not found`, {
          extensions: {
            code: GraphQLErrorCode.NOT_FOUND,
          },
        });
      }

      return subscribe(`${SubscriptionTopicPrefix.NOTE_DELETED}:noteId=${notePublicId}`);
    } else {
      // Subscribe to deletion of own notes
      const userId = auth.session.user._id.toString('base64');
      return subscribe(`${SubscriptionTopicPrefix.NOTE_DELETED}:userId=${userId}`);
    }
  },
};

export async function publishNoteDeleted(
  { publish, auth }: GraphQLResolversContext,
  ownerUserId: ObjectId,
  payload: ResolversTypes['NoteDeletedPayload']
) {
  assertAuthenticated(auth);

  const notePublicId = (await payload)?.contentId;
  if (!notePublicId) return;

  const userId = ownerUserId.toString('base64');

  return Promise.allSettled([
    publish(`${SubscriptionTopicPrefix.NOTE_DELETED}:noteId=${notePublicId}`, {
      noteDeleted: payload,
    }),
    publish(`${SubscriptionTopicPrefix.NOTE_DELETED}:userId=${userId}`, {
      noteDeleted: payload,
    }),
  ]);
}
