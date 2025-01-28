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

const ExcludedConnectionNotesTable_Query = gql(`
  query ExcludedConnectionNotesTable_Query($userBy: SignedInUserByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLinkConnection(category: DEFAULT) {
        edges {
          node {
            id
            excludeFromConnection
            categoryName
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

export function ExcludedConnectionNotesTable() {
  const userId = useUserId();

  const { data } = useQuery(ExcludedConnectionNotesTable_Query, {
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
    (edge) => edge.node.excludeFromConnection
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
          </TableRow>
        </TableHead>
        <TableBody>
          {edges.map((edge) => (
            <TableRow key={edge.node.id}>
              <TableCell>{edge.node.note.id}</TableCell>
              <TableCell>{edge.node.pendingStatus ?? <RemoveIcon />}</TableCell>
              <TableCell>{edge.node.categoryName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
