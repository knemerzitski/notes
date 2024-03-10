import { GraphQLResolversContext } from '../../../../graphql/context';
import type {
  NoteUpdatedPayload,
  SubscriptionResolvers,
} from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';
import { isAuthenticated } from '../../../session/auth-context';

export const noteUpdated: NonNullable<SubscriptionResolvers['noteUpdated']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!isAuthenticated(auth)) return denySubscription();

    return subscribe(`NOTE_UPDATED:user-${auth.session.user.publicId}`, {
      onAfterSubscribe() {
        // TODO on sub start receiving connected users, publish to all other users about this user?
      },
      onComplete() {
        // must implement publish?
        // TODO subscription ended and removed, remove used from active list?
      },
    });
  },
  resolve(payload: NoteUpdatedPayload) {
    return payload;
  },
};

export async function publishNoteUpdated(
  { publish, auth }: GraphQLResolversContext,
  payload: NoteUpdatedPayload
) {
  assertAuthenticated(auth);

  return publish(`NOTE_UPDATED:user-${auth.session.user.publicId}`, {
    noteUpdated: payload,
  });
}
