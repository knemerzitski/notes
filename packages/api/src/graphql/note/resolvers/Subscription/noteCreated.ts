import { GraphQLResolversContext } from '../../../../graphql/context';
import type {
  NoteCreatedPayload,
  SubscriptionResolvers,
} from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';

export const noteCreated: NonNullable<SubscriptionResolvers['noteCreated']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!auth) return denySubscription();

    return subscribe(`NOTE_CREATED:USER-${auth.session.user.publicId}`);

    // Or can subscribe by filter
    // return subscribe(`NOTE_CREATED`, {
    //   filter: {
    //     noteCreated: {
    //       userId: auth.userId,
    //     },
    //   },
    // });
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

  return publish(`NOTE_CREATED:${auth.session.user.publicId}`, {
    noteCreated: payload,
  });

  // Can publish by filter
  // return publish(`NOTE_CREATED`, {
  //   noteCreated: note,
  // });
}
