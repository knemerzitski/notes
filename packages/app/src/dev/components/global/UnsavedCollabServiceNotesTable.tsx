import { useQuery } from '@apollo/client';
import CheckIcon from '@mui/icons-material/Check';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
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

import { CollabService } from '../../../../../collab/src';
import { gql } from '../../../__generated__';
import { useCollabServiceManager } from '../../../note/context/collab-service-manager';
import { useUserId } from '../../../user/context/user-id';

const UnsavedCollabServiceNotesTable_Query = gql(`
  query UnsavedCollabServiceNotesTable_Query($id: ObjectID!){
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        unsavedCollabServices {
          id
        }
      }
    }
  }
`);

export function UnsavedCollabServiceNotesTable() {
  const collabServiceManager = useCollabServiceManager();

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

  const unsavedCollabServices = data.signedInUser.local.unsavedCollabServices.map(
    ({ id }) => {
      let collabService: CollabService | undefined;
      const collabItem = collabServiceManager.getIfExists(id);
      if (collabItem && !collabItem.initStatus.isPending) {
        collabService = collabItem.get().fieldCollab.service;
      }

      return { id, collabService };
    }
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
                {collabService ? (
                  collabService.haveLocalChanges() ? (
                    <CheckIcon />
                  ) : (
                    <RemoveIcon />
                  )
                ) : (
                  <QuestionMarkIcon />
                )}
              </TableCell>
              <TableCell>
                {collabService ? (
                  collabService.haveSubmittedChanges() ? (
                    <CheckIcon />
                  ) : (
                    <RemoveIcon />
                  )
                ) : (
                  <QuestionMarkIcon />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
