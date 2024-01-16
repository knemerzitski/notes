import { GraphQLResolversContext } from '../../../../graphql/context';
import type {
  NoteDeletedPayload,
  SubscriptionResolvers,
} from '../../../../graphql/types.generated';

export const noteDeleted: NonNullable<SubscriptionResolvers['noteDeleted']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!auth) return denySubscription();

    return subscribe(`NOTE_DELETED:USER-${auth.session.user.publicId}`);
  },
  resolve(payload: NoteDeletedPayload) {
    return payload;
  },
};

export async function publishNoteDeleted(
  { publish, auth }: GraphQLResolversContext,
  payload: NoteDeletedPayload
) {
  if (!auth) return;

  return publish(`NOTE_DELETED:USER-${auth.session.user.publicId}`, {
    noteDeleted: payload,
  });
}
