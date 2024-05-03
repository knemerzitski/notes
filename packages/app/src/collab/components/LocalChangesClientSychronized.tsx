import { useUpdateClientSyncStatus } from '../../context/ClientSyncStatusProvider';
import { gql } from '../../__generated__/gql';
import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';

const FRAGMENT = gql(`
  fragment LocalChangesClientSychronized on CollabText {
    submittedRecord {
      generatedId
    }
    localChanges
  }
`);

interface LocalChangesClientSychronizedProps {
  collabTextId: string;
}

/**
 * Displays loading indicator while CollabText has local changes.
 */
export default function LocalChangesClientSychronized({
  collabTextId,
}: LocalChangesClientSychronizedProps) {
  const updateClientSynchronized = useUpdateClientSyncStatus();

  const apolloClient = useApolloClient();

  useEffect(() => {
    const subscription = apolloClient
      .watchFragment({
        from: {
          id: collabTextId,
          __typename: 'CollabText',
        },
        fragment: FRAGMENT,
      })
      .subscribe({
        next(value) {
          const collabText = value.data;

          // Synchronized if have no local and submitted changes
          updateClientSynchronized(
            collabTextId,
            collabText.localChanges == null && collabText.submittedRecord == null
          );
        },
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [apolloClient, collabTextId, updateClientSynchronized]);

  return null;
}
