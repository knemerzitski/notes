import { ObjectId } from 'mongodb';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import type { ResolversTypes, SubscriptionResolvers } from './../../../types.generated';
import { GraphQLResolversContext } from '../../../context';
import { isAuthenticated } from '../../../../services/auth/auth';
import { objectIdToStr } from '../../../../services/utils/objectid';

export function getTopicForUser(userId: ObjectId) {
  return `${SubscriptionTopicPrefix.SIGNED_IN_USER_EVENTS}:${objectIdToStr(userId)}`;
}

export const signedInUserEvents: NonNullable<
  SubscriptionResolvers['signedInUserEvents']
> = {
  subscribe: (_parent, _arg, ctx) => {
    const { auth, subscribe, denySubscription } = ctx;
    if (!isAuthenticated(auth)) return denySubscription();

    const currentUserId = auth.session.userId;

    return subscribe(getTopicForUser(currentUserId));
  },
};

export async function publishSignedInUserEvents(
  targetUserId: ObjectId,
  events: ResolversTypes['SignedInUserEventsPayload'],
  { publish }: Pick<GraphQLResolversContext, 'publish'>
) {
  return await publish(getTopicForUser(targetUserId), {
    signedInUserEvents: events,
  });
}

export function publishSignedInUserMutations(
  targetUserId: ObjectId,
  mutations: ResolversTypes['SignedInUserMutations'][],
  ctx: Pick<GraphQLResolversContext, 'publish'>
) {
  return publishSignedInUserEvents(targetUserId, { mutations }, ctx);
}

export function publishSignedInUserMutation(
  targetUserId: ObjectId,
  mutation: ResolversTypes['SignedInUserMutations'],
  ctx: Pick<GraphQLResolversContext, 'publish'>
) {
  return publishSignedInUserEvents(targetUserId, { mutations: [mutation] }, ctx);
}
