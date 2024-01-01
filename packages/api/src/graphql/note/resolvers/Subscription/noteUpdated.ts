import { GraphQLResolversContext } from '../../../../graphql/context';
import type { Note, SubscriptionResolvers } from '../../../../graphql/types.generated';

export const noteUpdated: NonNullable<SubscriptionResolvers['noteUpdated']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!auth) return denySubscription();

    return subscribe(`NOTE_UPDATED:${auth.userId}`);
  },
  resolve(note: Note) {
    return note;
  },
};

export async function publishNoteUpdated(
  { publish, auth }: GraphQLResolversContext,
  note: Note
) {
  if (!auth) return;

  return publish(`NOTE_UPDATED:${auth.userId}`, {
    noteUpdated: note,
  });
}
