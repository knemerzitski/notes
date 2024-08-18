import { ObjectId } from 'mongodb';

import { isAuthenticated } from '../../../auth-context';
import { GraphQLResolversContext } from '../../../context';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';

export const noteCreated: NonNullable<SubscriptionResolvers['noteCreated']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!isAuthenticated(auth)) return denySubscription();

    const userId = auth.session.user._id.toString('base64');

    return subscribe(`${SubscriptionTopicPrefix.NOTE_CREATED}:userId=${userId}`);
  },
};

export async function publishNoteCreated(
  targetUserId: ObjectId,
  payload: ResolversTypes['NoteCreatedPayload'],
  { publish }: Pick<GraphQLResolversContext, 'publish'>
) {
  return await publish(
    `${SubscriptionTopicPrefix.NOTE_CREATED}:userId=${targetUserId.toString('base64')}`,
    {
      noteCreated: payload,
    }
  );
}
