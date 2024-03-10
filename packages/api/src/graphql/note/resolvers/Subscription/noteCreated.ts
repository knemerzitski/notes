import { GraphQLResolversContext } from '../../../../graphql/context';
import type {
  NoteCreatedPayload,
  SubscriptionResolvers,
} from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';
import { isAuthenticated } from '../../../session/auth-context';

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
