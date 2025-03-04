import { ObjectId } from 'mongodb';

import { PublisherOptions } from '../../../../../../../lambda-graphql/src/pubsub/publish';

import { objectIdToStr } from '../../../../../mongodb/utils/objectid';

import { SubscriptionTopicPrefix } from '../../../../subscriptions';

import { GraphQLResolversContext } from '../../../../types';

import type { ResolversTypes, SubscriptionResolvers } from './../../../types.generated';

export function signedInUserTopic(userId: ObjectId) {
  return `${SubscriptionTopicPrefix.SIGNED_IN_USER_EVENTS}:${objectIdToStr(userId)}`;
}

export const signedInUserEvents: NonNullable<
  SubscriptionResolvers['signedInUserEvents']
> = {
  subscribe: (_parent, arg, ctx) => {
    const { subscribe } = ctx;

    const { input } = arg;

    const currentUserId = input.authUser.id;

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
