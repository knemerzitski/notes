import { GraphQLResolversContext } from '../../../../graphql/context';
import type {
  NoteDeletedPayload,
  SubscriptionResolvers,
} from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';
import { isAuthenticated } from '../../../session/auth-context';

export const noteDeleted: NonNullable<SubscriptionResolvers['noteDeleted']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!isAuthenticated(auth)) return denySubscription();

    return subscribe(`NOTE_DELETED:user-${auth.session.user.publicId}`);
  },
  resolve(payload: NoteDeletedPayload) {
    return payload;
  },
};

export async function publishNoteDeleted(
  { publish, auth }: GraphQLResolversContext,
  payload: NoteDeletedPayload
) {
  assertAuthenticated(auth);

  return publish(`NOTE_DELETED:user-${auth.session.user.publicId}`, {
    noteDeleted: payload,
  });
}
