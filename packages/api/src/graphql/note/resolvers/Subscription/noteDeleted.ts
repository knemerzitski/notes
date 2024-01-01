import { GraphQLResolversContext } from '../../../../graphql/context';
import type { SubscriptionResolvers } from '../../../../graphql/types.generated';

export const noteDeleted: NonNullable<SubscriptionResolvers['noteDeleted']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!auth) return denySubscription();

    return subscribe(`NOTE_DELETED:${auth.userId}`);
  },
  resolve(id: string) {
    return id;
  },
};

export async function publishNoteDeleted(
  { publish, auth }: GraphQLResolversContext,
  id: string
) {
  if (!auth) return;

  return publish(`NOTE_DELETED:${auth.userId}`, {
    noteDeleted: id,
  });
}
