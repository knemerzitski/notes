import { ObjectId } from 'mongodb';

import { PublisherOptions } from '~lambda-graphql/pubsub/publish';

import { objectIdToStr } from '../../../../../mongodb/utils/objectid';

import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { SubscriptionTopicPrefix } from '../../../../subscriptions';

import { GraphQLResolversContext } from '../../../../types';

import type { ResolversTypes, SubscriptionResolvers } from './../../../types.generated';

export function signedInUserTopic(userId: ObjectId) {
  return `${SubscriptionTopicPrefix.SIGNED_IN_USER_EVENTS}:${objectIdToStr(userId)}`;
}

export const signedInUserEvents: NonNullable<
  SubscriptionResolvers['signedInUserEvents']
> = {
  subscribe: (_parent, _arg, ctx) => {
    const { auth, subscribe } = ctx;
    assertAuthenticated(auth);

    const currentUserId = auth.session.userId;
    return subscribe(signedInUserTopic(currentUserId));
  },
};

export async function publishSignedInUserEvents(
  targetUserId: ObjectId,
  payload: ResolversTypes['SignedInUserEventsPayload'],
  { publish }: Pick<GraphQLResolversContext, 'publish'>,
  options?: PublisherOptions
) {
  return await publish(
    signedInUserTopic(targetUserId),
    {
      signedInUserEvents: payload,
    },
    options
  );
}

export function publishSignedInUserMutations(
  targetUserId: ObjectId,
  mutations: ResolversTypes['SignedInUserMutation'][],
  ctx: Pick<GraphQLResolversContext, 'publish'>,
  options?: PublisherOptions
) {
  return publishSignedInUserEvents(targetUserId, { mutations }, ctx, options);
}

export function publishSignedInUserMutation(
  targetUserId: ObjectId,
  mutation: ResolversTypes['SignedInUserMutation'],
  ctx: Pick<GraphQLResolversContext, 'publish'>,
  options?: PublisherOptions
) {
  return publishSignedInUserEvents(targetUserId, { mutations: [mutation] }, ctx, options);
}
