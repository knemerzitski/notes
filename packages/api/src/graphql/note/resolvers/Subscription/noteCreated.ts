import { isAuthenticated } from '../../../auth-context';
import { assertAuthenticated } from '../../../base/directives/auth';
import { GraphQLResolversContext } from '../../../context';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';

export const noteCreated: NonNullable<SubscriptionResolvers['noteCreated']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!isAuthenticated(auth)) return denySubscription();

    const userId = auth.session.user._id.toString('base64');

    return subscribe(`${SubscriptionTopicPrefix.NOTE_CREATED}:${userId}`);
  },
};

export function publishNoteCreated(
  { publish, auth }: GraphQLResolversContext,
  payload: ResolversTypes['NoteCreatedPayload']
) {
  assertAuthenticated(auth);

  const userId = auth.session.user._id.toString('base64');

  return publish(`${SubscriptionTopicPrefix.NOTE_CREATED}:${userId}`, {
    noteCreated: payload,
  });
}
