import { OperationTypeNode } from 'graphql';
import { useEffect } from 'react';

import { useUpdateClientSyncStatus } from '../../hooks/useIsClientSynchronized';
import useStatsLink from '../hooks/useStatsLink';

export default function ApolloClientSynchronized() {
  const statsLink = useStatsLink();
  const updateClientSynchronized = useUpdateClientSyncStatus();

  // Subscribe to apollo client operation count changes and update client sync accordingly
  useEffect(() => {
    return statsLink.subscribe(({ type }) => {
      if (type === OperationTypeNode.QUERY || type === OperationTypeNode.MUTATION) {
        updateClientSynchronized(
          statsLink,
          statsLink.ongoing.query === 0 && statsLink.ongoing.mutation === 0
        );
      }
    });
  }, [statsLink, updateClientSynchronized]);

  return null;
}
