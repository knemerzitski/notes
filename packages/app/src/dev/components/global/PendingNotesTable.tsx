import { useQuery } from '@apollo/client';
import CheckIcon from '@mui/icons-material/Check';
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

const PendingNotesTable_Query = gql(`
  query PendingNotesTable_Query($id: ObjectID!){
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        pendingNotes {
          id
          pendingStatus
          hiddenInList
          categoryName
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

  const pendingNotes = data.signedInUser.local.pendingNotes;

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
            <TableCell>Hidden</TableCell>
            <TableCell>Category</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pendingNotes.map((noteLink) => (
            <TableRow key={noteLink.id}>
              <TableCell>{noteLink.note.id}</TableCell>
              <TableCell>{noteLink.pendingStatus ?? <RemoveIcon />}</TableCell>
              <TableCell>
                {noteLink.hiddenInList ? <CheckIcon /> : <RemoveIcon />}
              </TableCell>
              <TableCell>{noteLink.categoryName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
