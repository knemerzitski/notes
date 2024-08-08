import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';

import { gql } from '../../../../__generated__/gql';
import { useCurrentUserId } from '../../../auth/user';

export const SUBSCRIPTION = gql(`
  subscription NoteCreated {
    noteCreated {
      note {
        id
        contentId
        isOwner
        textFields {
          key
          value {
            id
            headText {
              revision
              changeset
            }
          }
        }
      }
    }
  }
`);

const QUERY_UPDATE = gql(`
  query NoteCreatedUpdateNotesConnection {
    notesConnection {
      notes {
        id
        contentId
        isOwner
        textFields {
          key
          value {
            id
            headText {
              revision
              changeset
            }
          }
        }
      }
    }
  }
`);

/**
 * Subscribe to creation of own notes.
 */
export function NoteCreatedSubscription() {
  const apolloClient = useApolloClient();
  const currentUserId = useCurrentUserId();

  useEffect(() => {
    if (!currentUserId) return;

    const observable = apolloClient.subscribe({
      query: SUBSCRIPTION,
    });

    const sub = observable.subscribe({
      next(value) {
        const newNote = value.data?.noteCreated.note;
        if (!newNote) return;

        // Update notes list, appending newNote
        apolloClient.cache.updateQuery(
          {
            query: QUERY_UPDATE,
          },
          (data) => {
            const existingNotes = data?.notesConnection.notes;
            if (!existingNotes) {
              return {
                notesConnection: {
                  notes: [newNote],
                },
              };
            }

            if (existingNotes.some((note) => note.id === newNote.id)) {
              return;
            }

            return {
              ...data,
              notesConnection: {
                ...data.notesConnection,
                notes: [...existingNotes, newNote],
              },
            };
          }
        );
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [apolloClient, currentUserId]);

  return null;
}
