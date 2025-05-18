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

const UnsavedCollabServiceNotesTable_Query = gql(`
  query UnsavedCollabServiceNotesTable_Query($id: ObjectID!){
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        unsavedCollabServices {
          id
          collabService
        }
      }
    }
  }
`);

export function UnsavedCollabServiceNotesTable() {
  const userId = useUserId();
  const { data } = useQuery(UnsavedCollabServiceNotesTable_Query, {
    fetchPolicy: 'cache-only',
    variables: {
      id: userId,
    },
  });

  if (!data) {
    return null;
  }

  const unsavedCollabServices = data.signedInUser.local.unsavedCollabServices;

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
            <TableCell>UserNoteLink.ID</TableCell>
            <TableCell>Local changes</TableCell>
            <TableCell>Submitted changes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {unsavedCollabServices.map(({ id, collabService }) => (
            <TableRow key={id}>
              <TableCell>{id}</TableCell>
              <TableCell>
                {collabService.haveLocalChanges() ? <CheckIcon /> : <RemoveIcon />}
              </TableCell>
              <TableCell>
                {collabService.haveSubmittedChanges() ? <CheckIcon /> : <RemoveIcon />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
