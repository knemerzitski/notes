import { useEffect } from 'react';

import { gql } from '../../../../__generated__/gql';
import { useCustomApolloClient } from '../../../apollo-client/context/CustomApolloClientProvider';
import { useCurrentUserId } from '../../../auth/user';
import { useNoteContentId } from '../context/NoteContentIdProvider';

export const SUBSCRIPTION = gql(`
  subscription NoteDeleted($input: NoteDeletedInput) {
    noteDeleted(input: $input) {
      contentId
    }
  }
`);

/**
 * Subscribe to specific note deletion. If unspecified then subscribes
 * to all notes of current user.
 */
export default function NoteDeletedSubscription() {
  const customApolloClient = useCustomApolloClient();
  const currentUserId = useCurrentUserId();

  const noteContentId = useNoteContentId(true);

  useEffect(() => {
    if (!currentUserId) return;
    const observable = customApolloClient.client.subscribe({
      query: SUBSCRIPTION,
      variables: noteContentId
        ? {
            input: {
              contentId: noteContentId,
            },
          }
        : undefined,
    });

    const sub = observable.subscribe({
      next(value) {
        const deletedContentId = value.data?.noteDeleted.contentId;
        if (!deletedContentId) return;

        const cache = customApolloClient.cache;

        customApolloClient.evict({
          id: cache.identify({
            contentId: deletedContentId,
            userId: currentUserId,
            __typename: 'Note',
          }),
        });
        customApolloClient.gc();
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [customApolloClient, noteContentId, currentUserId]);

  return null;
}
