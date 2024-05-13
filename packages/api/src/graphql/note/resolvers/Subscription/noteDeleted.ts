import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { GraphQLResolversContext } from '../../../context';
import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';
import { isAuthenticated } from '../../../auth-context';
import { assertAuthenticated } from '../../../base/directives/auth';
import { SubscriptionTopicPrefix } from '../../../subscriptions';

export const noteDeleted: NonNullable<SubscriptionResolvers['noteDeleted']> = {
  subscribe: async (_parent, { input }, ctx) => {
    const { auth, datasources, subscribe, denySubscription } = ctx;
    if (!isAuthenticated(auth)) return denySubscription();

    const notePublicId = input?.contentId;

    const currentUserId = auth.session.user._id;

    if (notePublicId) {
      // Ensure current user has access to this note
      const userNote = await datasources.notes.getNote({
        userId: currentUserId,
        publicId: notePublicId,
        noteQuery: {
          _id: 1,
        },
      });

      if (!userNote._id) {
        throw new GraphQLError(`Note '${notePublicId}' not found`, {
          extensions: {
            code: GraphQLErrorCode.NotFound,
          },
        });
      }

      return subscribe(`${SubscriptionTopicPrefix.NoteDeleted}:noteId=${notePublicId}`);
    } else {
      // Subscribe to deletion of own notes
      const userId = auth.session.user._id.toString('base64');
      return subscribe(`${SubscriptionTopicPrefix.NoteDeleted}:userId=${userId}`);
    }
  },
};

export async function publishNoteDeleted(
  { publish, auth }: GraphQLResolversContext,
  payload: ResolversTypes['NoteDeletedPayload']
) {
  assertAuthenticated(auth);

  const notePublicId = (await payload)?.contentId;
  if (!notePublicId) return;

  const userId = auth.session.user._id.toString('base64');

  return Promise.allSettled([
    publish(`${SubscriptionTopicPrefix.NoteDeleted}:noteId=${notePublicId}`, {
      noteDeleted: payload,
    }),
    publish(`${SubscriptionTopicPrefix.NoteDeleted}:userId=${userId}`, {
      noteDeleted: payload,
    }),
  ]);
}
