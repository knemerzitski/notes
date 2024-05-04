import { gql } from '../../__generated__/gql';
import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';
import useUpdateClientSynchronization from '../../local-state/base/hooks/useUpdateClientSynchronization';

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
  const updateClientSynchronization = useUpdateClientSynchronization();

  const apolloClient = useApolloClient();

  useEffect(() => {
    const syncId =
      apolloClient.cache.identify({
        id: collabTextId,
        __typename: 'CollabText',
      }) ?? `CollabText:${collabTextId}`;

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
          updateClientSynchronization(
            syncId,
            collabText.localChanges == null && collabText.submittedRecord == null
          );
        },
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [apolloClient, collabTextId, updateClientSynchronization]);

  return null;
}
