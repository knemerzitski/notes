import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { GraphQLResolversContext } from '../../../context';
import type { ResolversTypes, SubscriptionResolvers } from '../../../types.generated';
import { isAuthenticated } from '../../../auth-context';
import { assertAuthenticated } from '../../../base/directives/auth';
import { SubscriptionTopicPrefix } from '../../../subscriptions';

export const noteUpdated: NonNullable<SubscriptionResolvers['noteUpdated']> = {
  subscribe: async (_parent, { input: { contentId: notePublicId } }, ctx) => {
    const { auth, datasources, subscribe, denySubscription } = ctx;
    if (!isAuthenticated(auth)) return denySubscription();

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

      return subscribe(`${SubscriptionTopicPrefix.NoteUpdated}:noteId=${notePublicId}`, {
        onAfterSubscribe() {
          // TODO let other connected clients know about this user
        },
        onComplete() {
          // TODO let other connected clients know this user left
        },
      });
    } else {
      // Subscribe to updates of own notes
      const userId = auth.session.user._id.toString('base64');
      return subscribe(`${SubscriptionTopicPrefix.NoteUpdated}:userId=${userId}`, {
        onAfterSubscribe() {
          // TODO let other connected clients know about this user
        },
        onComplete() {
          // TODO let other connected clients know this user left
        },
      });
    }
  },
};

export async function publishNoteUpdated(
  { publish, auth }: GraphQLResolversContext,
  payload: ResolversTypes['NoteUpdatedPayload']
) {
  assertAuthenticated(auth);

  const notePublicId = (await payload)?.contentId;
  if (!notePublicId) return;

  const userId = auth.session.user._id.toString('base64');

  return Promise.allSettled([
    publish(`${SubscriptionTopicPrefix.NoteUpdated}:noteId=${notePublicId}`, {
      noteUpdated: payload,
    }),
    publish(`${SubscriptionTopicPrefix.NoteUpdated}:userId=${userId}`, {
      noteUpdated: payload,
    }),
  ]);
}
