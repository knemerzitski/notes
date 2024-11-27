import { useApolloClient, useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { useUserId } from '../../user/context/user-id';
import { useEffect } from 'react';
import { setNotePendingStatus } from '../models/local-note/set-status';
import { NotePendingStatus } from '../../__generated__/graphql';
import { clearExcludeNoteFromConnection } from '../models/local-note/clear-exclude';
import { addNoteToConnection } from '../models/note-connection/add';

const ProcessPendingNotesOnce_Query = gql(`
  query ProcessPendingNotesOnce_Query($id: ID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        pendingNotes {
          id
          pendingStatus
        }
      }
    }
  }
`);

export function ProcessPendingNotesOnce() {
  const client = useApolloClient();
  const userId = useUserId();
  const { data } = useQuery(ProcessPendingNotesOnce_Query, {
    variables: {
      id: userId,
    },
    fetchPolicy: 'cache-only',
    nextFetchPolicy: 'standby',
  });

  useEffect(() => {
    if (!data?.signedInUser) {
      return;
    }

    data.signedInUser.local.pendingNotes.forEach((noteLink) => {
      const by = { userNoteLinkId: noteLink.id };
      if (!noteLink.pendingStatus) {
        // Setting status null will remove it from ´pendingNotes` list
        setNotePendingStatus(by, null, client.cache);
        return;
      }

      if (noteLink.pendingStatus === NotePendingStatus.EMPTY) {
        // Do nothing with empty note
        return;
      }

      if (
        noteLink.pendingStatus === NotePendingStatus.SUBMITTING ||
        noteLink.pendingStatus === NotePendingStatus.DONE
      ) {
        // Add note to connection
        clearExcludeNoteFromConnection(by, client.cache);
        addNoteToConnection(by, client.cache);
      }

      if (noteLink.pendingStatus === NotePendingStatus.DONE) {
        setNotePendingStatus(by, null, client.cache);
      }
    });
  }, [data, client]);

  return null;
}
