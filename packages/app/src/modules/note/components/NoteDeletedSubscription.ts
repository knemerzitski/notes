import { useEffect } from 'react';

import { useApolloClient } from '@apollo/client';
import { gql } from '../../../__generated__/gql';
import { useNoteContentIdMaybe } from '../context/NoteContentIdProvider';
import useNoteByContentId from '../hooks/useNoteByContentId';
import { removeActiveNotes } from '../active-notes';

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
  const apolloClient = useApolloClient();
  const noteContentId = useNoteContentIdMaybe();

  const noteContentIdToId = useNoteByContentId();

  useEffect(() => {
    const observable = apolloClient.subscribe({
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

        const cache = apolloClient.cache;

        const note = noteContentIdToId(deletedContentId);
        if (note) {
          removeActiveNotes(cache, [note]);
          cache.evict({
            id: cache.identify(note),
          });
          cache.gc();
        }
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [apolloClient, noteContentId, noteContentIdToId]);

  return null;
}
