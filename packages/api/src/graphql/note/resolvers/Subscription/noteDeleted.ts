import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { GraphQLResolversContext } from '../../../../graphql/context';
import type {
  NoteDeletedPayload,
  SubscriptionResolvers,
} from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';
import { isAuthenticated } from '../../../session/auth-context';

export const noteDeleted: NonNullable<SubscriptionResolvers['noteDeleted']> = {
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

    return subscribe(`NOTE_DELETED:${notePublicId}`);
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

  return publish(`NOTE_DELETED:${payload.id}`, {
    noteDeleted: payload,
  });
}
