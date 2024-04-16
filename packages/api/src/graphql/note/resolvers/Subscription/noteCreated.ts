import { GraphQLResolversContext } from '../../../context';
import type {
  NoteCreatedPayload,
  SubscriptionResolvers,
} from '../../../types.generated';
import { isAuthenticated } from '../../../auth-context';
import { assertAuthenticated } from '../../../base/directives/auth';

export const noteCreated: NonNullable<SubscriptionResolvers['noteCreated']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!isAuthenticated(auth)) return denySubscription();

    return subscribe(`NOTE_CREATED:user-${auth.session.user.publicId}`);
  },
  resolve(payload: NoteCreatedPayload) {
    return payload;
  },
};

export async function publishNoteCreated(
  { publish, auth }: GraphQLResolversContext,
  payload: NoteCreatedPayload
) {
  assertAuthenticated(auth);

  return publish(`NOTE_CREATED:user-${auth.session.user.publicId}`, {
    noteCreated: payload,
  });
}
