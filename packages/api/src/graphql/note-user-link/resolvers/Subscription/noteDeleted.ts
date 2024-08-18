import { ObjectId } from 'mongodb';

import { isAuthenticated } from '../../../auth-context';
import { GraphQLResolversContext } from '../../../context';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';

export const noteDeleted: NonNullable<SubscriptionResolvers['noteDeleted']> = {
  subscribe: (_parent, _args, ctx) => {
    const { auth, subscribe, denySubscription } = ctx;
    if (!isAuthenticated(auth)) return denySubscription();

    const userId = auth.session.user._id.toString('base64');
    return subscribe(`${SubscriptionTopicPrefix.NOTE_DELETED}:userId=${userId}`);
  },
};

export async function publishNoteDeleted(
  targetUserId: ObjectId,
  payload: ResolversTypes['NoteDeletedPayload'],
  { publish }: Pick<GraphQLResolversContext, 'publish'>
) {
  return publish(
    `${SubscriptionTopicPrefix.NOTE_DELETED}:userId=${targetUserId.toString('base64')}`,
    {
      noteDeleted: payload,
    }
  );
}
