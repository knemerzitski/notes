import { ObjectId } from 'mongodb';

import { isAuthenticated } from '../../../auth-context';

import { GraphQLResolversContext } from '../../../context';
import { SubscriptionTopicPrefix } from '../../../subscriptions';

import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';

export const noteEvents: NonNullable<SubscriptionResolvers['noteEvents']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!isAuthenticated(auth)) return denySubscription();

    const userId = auth.session.user._id.toString('base64');

    return subscribe(`${SubscriptionTopicPrefix.NOTE_EVENTS}:userId=${userId}`);
  },
};

export async function publishNoteEvents(
  targetUserId: ObjectId,
  events: ResolversTypes['NoteEventsPayload'],
  { publish }: Pick<GraphQLResolversContext, 'publish'>
) {
  return await publish(
    `${SubscriptionTopicPrefix.NOTE_EVENTS}:userId=${targetUserId.toString('base64')}`,
    {
      noteEvents: events,
    }
  );
}

export async function publishNoteCreated(
  targetUserId: ObjectId,
  event: NonNullable<Awaited<ResolversTypes['NoteCreatedEvent']>>,
  ctx: Pick<GraphQLResolversContext, 'publish'>
) {
  return publishNoteEvents(
    targetUserId,
    {
      events: [
        {
          ...event,
          __typename: 'NoteCreatedEvent',
        },
      ],
    },
    ctx
  );
}

export async function publishNoteUpdated(
  targetUserId: ObjectId,
  event: NonNullable<Awaited<ResolversTypes['NoteUpdatedEvent']>>,
  ctx: Pick<GraphQLResolversContext, 'publish'>
) {
  return publishNoteEvents(
    targetUserId,
    {
      events: [
        {
          ...event,
          __typename: 'NoteUpdatedEvent',
        },
      ],
    },
    ctx
  );
}

export async function publishNoteDeleted(
  targetUserId: ObjectId,
  event: NonNullable<Awaited<ResolversTypes['NoteDeletedEvent']>>,
  ctx: Pick<GraphQLResolversContext, 'publish'>
) {
  return publishNoteEvents(
    targetUserId,
    {
      events: [
        {
          ...event,
          __typename: 'NoteDeletedEvent',
        },
      ],
    },
    ctx
  );
}
