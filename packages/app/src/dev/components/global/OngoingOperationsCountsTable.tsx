import { useEffect, useState } from 'react';
import { useStatsLink } from '../../../graphql/context/stats-link';
import { useUserId } from '../../../user/context/user-id';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

function copyStats(statsLink: ReturnType<typeof useStatsLink>, userId: string) {
  return {
    query: statsLink.getUserStats(userId).query.ongoing,
    mutation: statsLink.getUserStats(userId).mutation.ongoing,
    subscription: statsLink.getUserStats(userId).subscription.ongoing,
  };
}

export function OngoingOperationsCountsTable() {
  const statsLink = useStatsLink();
  const userId = useUserId();

  const [stats, setStats] = useState(() => copyStats(statsLink, userId));

  useEffect(() => {
    return statsLink.getUserEventBus(userId).on('*', () => {
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
