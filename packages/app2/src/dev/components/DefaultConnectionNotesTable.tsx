import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { gql } from '../../__generated__';
import { useQuery } from '@apollo/client';
import RemoveIcon from '@mui/icons-material/Remove';

const DefaultConnectionNotesTable_Query = gql(`
  query DefaultConnectionNotesTable_Query {
    userNoteLinkConnection(category: DEFAULT) {
      edges {
        node {
          id
          excludeFromConnection
          categoryName
          connectionCategoryName
          originalCategoryName
          pendingStatus
          note {
            id
          }
        }
      }

    }
  }
`);

export function DefaultConnectionNotesTable() {
  const { data } = useQuery(DefaultConnectionNotesTable_Query, {
    fetchPolicy: 'cache-only',
  });

  if (!data) {
    return null;
  }

  const edges = data.userNoteLinkConnection.edges.filter(
    (edge) => !edge.node.excludeFromConnection
  );

  if (!edges) {
    return null;
  }

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
              <TableCell>{edge.node.connectionCategoryName ?? <RemoveIcon />}</TableCell>
              <TableCell>{edge.node.originalCategoryName ?? <RemoveIcon />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
