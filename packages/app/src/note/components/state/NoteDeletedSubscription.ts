import { useEffect } from 'react';

import { useApolloClient } from '@apollo/client';
import { gql } from '../../../__generated__/gql';
import { activeNotesVar } from '../../state/reactive-vars';

export const SUBSCRIPTION = gql(`
  subscription NoteDeleted($input: NoteDeletedInput) {
    noteDeleted(input: $input) {
      contentId
    }
  }
`);

const QUERY = gql(`
  query NoteDeletedUserNotesMapping {
    userNoteMappings @client {
      user {
        id
      }
      note {
        id
        contentId
      }
    }
  }
`);

interface NoteCreatedSubscriptionProps {
  /**
   * Subscribe to specific note deletion. If unspecified then subscribes
   * to all notes of current user.
   */
  noteContentId?: string;
}

/**
 * Subscribe to creation of own notes.
 */
export default function NoteDeletedSubscription({
  noteContentId,
}: NoteCreatedSubscriptionProps) {
  const apolloClient = useApolloClient();

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
        console.log('deleted', deletedContentId, Object.keys(activeNotesVar()));
        if (!deletedContentId) return;

        const cache = apolloClient.cache;

        const queryResult = cache.readQuery({
          query: QUERY,
        });
        if (!queryResult) return;
        const { userNoteMappings } = queryResult;

        const deletedUserNoteMappings = userNoteMappings.filter(
          ({ note: { contentId } }) => contentId === deletedContentId
        );

        // Remove note from list of active notes
        const updatedActiveNotes = activeNotesVar();
        deletedUserNoteMappings.forEach((deletedUserNote) => {
          const noteRef = cache.identify(deletedUserNote.note);
          if (noteRef) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete updatedActiveNotes[noteRef];
          }
        });
        activeNotesVar(updatedActiveNotes);

        // Evict note related data from cache
        deletedUserNoteMappings.forEach((deletedUserNote) => {
          console.log('pruge', deletedUserNote);
          cache.evict({
            id: cache.identify(deletedUserNote),
          });
          cache.evict({
            id: cache.identify(deletedUserNote.note),
          });
        });
        console.log('gc', Object.keys(activeNotesVar()));
        cache.gc();
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [apolloClient, noteContentId]);

  return null;
}
