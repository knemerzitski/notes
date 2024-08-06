import { ObjectId } from 'mongodb';

import { isAuthenticated } from '../../../auth-context';
import { GraphQLResolversContext } from '../../../context';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';

export const noteUpdated: NonNullable<SubscriptionResolvers['noteUpdated']> = {
  subscribe: (_parent, _args, ctx) => {
    const { auth, subscribe, denySubscription } = ctx;
    if (!isAuthenticated(auth)) return denySubscription();

    const userId = auth.session.user._id.toString('base64');

    return subscribe(`${SubscriptionTopicPrefix.NOTE_UPDATED}:userId=${userId}`, {
      onAfterSubscribe() {
        // TODO let other connected clients know about this user
      },
      onComplete() {
        // TODO let other connected clients know this user left
      },
    });
  },
};

export async function publishNoteUpdated(
  targetUserId: ObjectId,
  payload: ResolversTypes['NoteUpdatedPayload'],
  { publish }: Pick<GraphQLResolversContext, 'publish'>
) {
  return publish(
    `${SubscriptionTopicPrefix.NOTE_UPDATED}:userId=${targetUserId.toString('base64')}`,
    {
      noteUpdated: payload,
    }
  );
}
