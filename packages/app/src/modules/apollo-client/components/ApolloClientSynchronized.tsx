import { OperationTypeNode } from 'graphql';
import { useEffect } from 'react';

import useUpdateClientSynchronization from '../../global/hooks/useUpdateClientSynchronized';
import useStatsLink from '../hooks/useStatsLink';

export default function ApolloClientSynchronized() {
  const statsLink = useStatsLink();
  const updateClientSynchronized = useUpdateClientSynchronization();

  // Subscribe to apollo client operation count changes and update client sync accordingly
  useEffect(() => {
    const unsubscribe = statsLink.subscribe(({ type }) => {
      if (type === OperationTypeNode.QUERY || type === OperationTypeNode.MUTATION) {
        updateClientSynchronized(
          statsLink,
          statsLink.ongoing.query === 0 && statsLink.ongoing.mutation === 0
        );
      }
    });
    return () => {
      updateClientSynchronized(statsLink, true);
      unsubscribe();
    };
  }, [statsLink, updateClientSynchronized]);

  return null;
}
