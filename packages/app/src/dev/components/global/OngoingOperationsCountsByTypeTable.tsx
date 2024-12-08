import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { OperationTypeNode } from 'graphql';
import { useEffect, useState } from 'react';

import { useStatsLink } from '../../../graphql/context/stats-link';
import { useUserId } from '../../../user/context/user-id';

function copyStats(statsLink: ReturnType<typeof useStatsLink>, userId: string) {
  return {
    query: statsLink.getUserOngoing(userId).byType(OperationTypeNode.QUERY),
    mutation: statsLink.getUserOngoing(userId).byType(OperationTypeNode.MUTATION),
    subscription: statsLink.getUserOngoing(userId).byType(OperationTypeNode.SUBSCRIPTION),
  };
}

export function OngoingOperationsCountsByTypeTable() {
  const statsLink = useStatsLink();
  const userId = useUserId();

  const [stats, setStats] = useState(() => copyStats(statsLink, userId));

  useEffect(() => {
    setStats(copyStats(statsLink, userId));
    return statsLink.getUserEventBus(userId).on('byType', () => {
      setStats(copyStats(statsLink, userId));
    });
  }, [statsLink, userId]);

  return (
    <TableContainer
      component={Paper}
      sx={{
        width: 'fit-content',
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Query</TableCell>
            <TableCell>Mutation</TableCell>
            <TableCell>Subscription</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>{stats.query}</TableCell>
            <TableCell>{stats.mutation}</TableCell>
            <TableCell>{stats.subscription}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
