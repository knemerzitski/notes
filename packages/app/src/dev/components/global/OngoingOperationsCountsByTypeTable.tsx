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

export function OngoingOperationsCountsByTypeTable() {
  const statsLink = useStatsLink();
  const userId = useUserId();

  const [countByType, setCountByType] = useState<Record<OperationTypeNode, number>>({
    query: 0,
    mutation: 0,
    subscription: 0,
  });

  useEffect(() => {
    return statsLink.subscribeToOngoingDocumentsCountByType(
      (countByType) => {
        setCountByType({ ...countByType });
      },
      {
        filterUserId: (testUserId) => testUserId == null || testUserId === userId,
      }
    );
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
            <TableCell>{countByType.query}</TableCell>
            <TableCell>{countByType.mutation}</TableCell>
            <TableCell>{countByType.subscription}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
