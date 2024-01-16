import { GraphQLResolversContext } from '../../../../graphql/context';
import type {
  NoteUpdatedPayload,
  SubscriptionResolvers,
} from '../../../../graphql/types.generated';

export const noteUpdated: NonNullable<SubscriptionResolvers['noteUpdated']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!auth) return denySubscription();

    return subscribe(`NOTE_UPDATED:USER-${auth.session.user.publicId}`);
  },
  resolve(payload: NoteUpdatedPayload) {
    return payload;
  },
};

export async function publishNoteUpdated(
  { publish, auth }: GraphQLResolversContext,
  payload: NoteUpdatedPayload
) {
  if (!auth) return;

  return publish(`NOTE_UPDATED:USER-${auth.session.user.publicId}`, {
    noteUpdated: payload,
  });
}
