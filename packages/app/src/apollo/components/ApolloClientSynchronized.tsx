import { OperationTypeNode } from 'graphql';
import { useEffect } from 'react';

import useStatsLink from '../hooks/useStatsLink';
import useUpdateClientSynchronization from '../../local-state/base/hooks/useUpdateClientSynchronization';

export default function ApolloClientSynchronized() {
  const statsLink = useStatsLink();
  const updateClientSynchronization = useUpdateClientSynchronization();

  // Subscribe to apollo client operation count changes and update client sync accordingly
  useEffect(() => {
    return statsLink.subscribe(({ type }) => {
      if (type === OperationTypeNode.QUERY || type === OperationTypeNode.MUTATION) {
        updateClientSynchronization(
          statsLink,
          statsLink.ongoing.query === 0 && statsLink.ongoing.mutation === 0
        );
      }
    });
  }, [statsLink, updateClientSynchronization]);

  return null;
}
