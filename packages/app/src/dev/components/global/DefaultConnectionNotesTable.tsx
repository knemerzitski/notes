import { useQuery } from '@apollo/client';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

import { gql } from '../../../__generated__';
import { useUserId } from '../../../user/context/user-id';

const DefaultConnectionNotesTable_Query = gql(`
  query DefaultConnectionNotesTable_Query($userBy: UserByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLinkConnection(category: DEFAULT) {
        edges {
          node {
            id
            excludeFromConnection
            categoryName
            originalCategoryName
            pendingStatus
            note {
              id
            }
          }
        }
      }
    }
  }
`);

export function DefaultConnectionNotesTable() {
  const userId = useUserId();

  const { data } = useQuery(DefaultConnectionNotesTable_Query, {
    variables: {
      userBy: {
        id: userId,
      },
    },
    fetchPolicy: 'cache-only',
  });

  if (!data) {
    return null;
  }

  const edges = data.signedInUser.noteLinkConnection.edges.filter(
    (edge) => !edge.node.excludeFromConnection
  );

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
            <TableCell>Note.ID</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Connection Category</TableCell>
            <TableCell>Original Category</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {edges.map((edge) => (
            <TableRow key={edge.node.id}>
              <TableCell>{edge.node.note.id}</TableCell>
              <TableCell>{edge.node.pendingStatus ?? <RemoveIcon />}</TableCell>
              <TableCell>{edge.node.categoryName}</TableCell>
              <TableCell>{edge.node.originalCategoryName ?? <RemoveIcon />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
