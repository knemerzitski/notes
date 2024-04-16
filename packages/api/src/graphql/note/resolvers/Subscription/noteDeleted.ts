import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { GraphQLResolversContext } from '../../../context';
import type {
  NoteDeletedPayload,
  SubscriptionResolvers,
} from '../../../types.generated';
import { isAuthenticated } from '../../../auth-context';
import { assertAuthenticated } from '../../../base/directives/auth';

export const noteDeleted: NonNullable<SubscriptionResolvers['noteDeleted']> = {
  subscribe: async (
    _parent,
    { input: { id: notePublicId } },
    { auth, mongoose: { model }, subscribe, denySubscription }
  ) => {
    if (!isAuthenticated(auth)) return denySubscription();

    const currentUserId = auth.session.user._id._id;

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
