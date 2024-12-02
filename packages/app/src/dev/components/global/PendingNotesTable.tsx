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
import { useQuery } from '@apollo/client';
import { useUserId } from '../../../user/context/user-id';
import CheckIcon from '@mui/icons-material/Check';
import RemoveIcon from '@mui/icons-material/Remove';

const PendingNotesTable_Query = gql(`
  query PendingNotesTable_Query($id: ID!){
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        pendingNotes {
          id
          pendingStatus
          excludeFromConnection
          categoryName
          connectionCategoryName
          note {
            id
          }
        }
      }
    }
  }
`);

export function PendingNotesTable() {
  const userId = useUserId();
  const { data } = useQuery(PendingNotesTable_Query, {
    fetchPolicy: 'cache-only',
    variables: {
      id: userId,
    },
  });

  if (!data) {
    return null;
  }

  const pendingNotes = data.signedInUser?.local.pendingNotes;

  if (!pendingNotes) {
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
            <TableCell>Excluded</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Connection Category</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pendingNotes.map((noteLink) => (
            <TableRow key={noteLink.id}>
              <TableCell>{noteLink.note.id}</TableCell>
              <TableCell>{noteLink.pendingStatus ?? <RemoveIcon />}</TableCell>
              <TableCell>
                {noteLink.excludeFromConnection ? <CheckIcon /> : <RemoveIcon />}
              </TableCell>
              <TableCell>{noteLink.categoryName}</TableCell>
              <TableCell>{noteLink.connectionCategoryName ?? <RemoveIcon />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}