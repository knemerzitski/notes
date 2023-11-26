import { GraphQLResolversContext } from '../../../context';

import type { Note, SubscriptionResolvers } from './../../../types.generated';

export const noteCreated: NonNullable<SubscriptionResolvers['noteCreated']> = {
  subscribe: (_parent, _arg, { auth, subscribe, denySubscription }) => {
    if (!auth) return denySubscription();

    return subscribe(`NOTE_CREATED:${auth.userId}`);

    // Or can subscribe by filter
    // return subscribe(`NOTE_CREATED`, {
    //   filter: {
    //     noteCreated: {
    //       userId: auth.userId,
    //     },
    //   },
    // });
  },
  resolve(note: Note) {
    return note;
  },
};

export async function publishNoteCreated(
  { publish, auth }: GraphQLResolversContext,
  note: Note
) {
  if (!auth) return;

  return publish(`NOTE_CREATED:${auth.userId}`, {
    noteCreated: note,
  });

  // Can publish by filter
  // return publish(`NOTE_CREATED`, {
  //   noteCreated: note,
  // });
}
