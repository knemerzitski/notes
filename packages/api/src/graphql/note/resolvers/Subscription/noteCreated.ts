import { GraphQLResolversContext } from '../../../context';
import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';
import { isAuthenticated } from '../../../auth-context';
import { assertAuthenticated } from '../../../base/directives/auth';
import { SubscriptionTopicPrefix } from '../../../subscriptions';

export const noteCreated: NonNullable<SubscriptionResolvers['noteCreated']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!isAuthenticated(auth)) return denySubscription();

    const userId = auth.session.user._id.toString('base64');

    return subscribe(`${SubscriptionTopicPrefix.NoteCreated}:${userId}`);
  },
};

export function publishNoteCreated(
  { publish, auth }: GraphQLResolversContext,
  payload: ResolversTypes['NoteCreatedPayload']
) {
  assertAuthenticated(auth);

  const userId = auth.session.user._id.toString('base64');

  return publish(`${SubscriptionTopicPrefix.NoteCreated}:${userId}`, {
    noteCreated: payload,
  });
}
