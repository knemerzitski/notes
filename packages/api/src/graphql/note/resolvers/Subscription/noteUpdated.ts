import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { GraphQLResolversContext } from '../../../../graphql/context';
import type {
  NoteUpdatedPayload,
  SubscriptionResolvers,
} from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';
import { isAuthenticated } from '../../../session/auth-context';

export const noteUpdated: NonNullable<SubscriptionResolvers['noteUpdated']> = {
  subscribe: async (
    _parent,
    { input: { id: notePublicId } },
    { auth, mongoose: { model }, subscribe, denySubscription }
  ) => {
    if (!isAuthenticated(auth)) return denySubscription();

    const currentUserId = ObjectId.createFromBase64(auth.session.user._id);

    const userNote = await model.UserNote.findOne({
      userId: currentUserId,
      notePublicId,
    }).lean();

    if (!userNote) {
      throw new GraphQLError('Note not found.', {
        extensions: {
          code: GraphQLErrorCode.NotFound,
        },
      });
    }

    return subscribe(`NOTE_UPDATED:${notePublicId}`, {
      onAfterSubscribe() {
        // TODO on sub start receiving connected users, publish to all other users about this user?
      },
      async onComplete() {
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

  return publish(`NOTE_UPDATED:${payload.id}`, {
    noteUpdated: payload,
  });
}
