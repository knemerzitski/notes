import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { isAuthenticated } from '../../../auth-context';
import { assertAuthenticated } from '../../../base/directives/auth';
import { GraphQLResolversContext } from '../../../context';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';

export const noteUpdated: NonNullable<SubscriptionResolvers['noteUpdated']> = {
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
      const userNote = await loaders.userNote.load({
        userId: currentUserId,
        publicId: notePublicId,
        userNoteQuery: {
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

      return subscribe(`${SubscriptionTopicPrefix.NOTE_UPDATED}:noteId=${notePublicId}`, {
        onAfterSubscribe() {
          // TODO let other connected clients know about this user
        },
        onComplete() {
          // TODO let other connected clients know this user left
        },
      });
    } else {
      // Subscribe to updates of own notes
      const userId = auth.session.user._id.toString('base64');
      return subscribe(`${SubscriptionTopicPrefix.NOTE_UPDATED}:userId=${userId}`, {
        onAfterSubscribe() {
          // TODO let other connected clients know about this user
        },
        onComplete() {
          // TODO let other connected clients know this user left
        },
      });
    }
  },
};

export async function publishNoteUpdated(
  { publish, auth }: GraphQLResolversContext,
  ownerUserId: ObjectId,
  payload: ResolversTypes['NoteUpdatedPayload']
) {
  assertAuthenticated(auth);

  const awaitedPayload = await payload;
  const notePublicId = awaitedPayload?.contentId;
  if (!notePublicId) return;

  const userId = ownerUserId.toString('base64');

  return Promise.allSettled([
    publish(`${SubscriptionTopicPrefix.NOTE_UPDATED}:noteId=${notePublicId}`, {
      noteUpdated: payload,
    }),
    publish(`${SubscriptionTopicPrefix.NOTE_UPDATED}:userId=${userId}`, {
      noteUpdated: payload,
    }),
  ]);
}
