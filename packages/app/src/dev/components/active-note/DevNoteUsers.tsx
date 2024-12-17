import { useQuery } from '@apollo/client';

import RemoveIcon from '@mui/icons-material/Remove';
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';

import { Changeset } from '~collab/changeset';
import { PartialDeep } from '~utils/types';

import { gql } from '../../../__generated__';
import { DevNoteUsersQueryQuery } from '../../../__generated__/graphql';
import { useNoteId } from '../../../note/context/note-id';

const DevNoteUsers_Query = gql(`
  query DevNoteUsers_Query($by: NoteByInput!) {
    note(by: $by){
      id
      users {
        id
        user {
          id
          profile {
            displayName
          }
        }
        open {
          closedAt
          collabTextEditing {
            revision
            latestSelection {
              start
              end
            }
          }
        }
      }
    }
  }
`);

export function DevNoteUsers() {
  const noteId = useNoteId();
  const { data } = useQuery(DevNoteUsers_Query, {
    fetchPolicy: 'cache-only',
    variables: {
      by: {
        id: noteId,
      },
    },
    returnPartialData: true,
  });
  const partialData: PartialDeep<DevNoteUsersQueryQuery, Changeset> | undefined = data;
  if (!partialData) {
    return null;
  }

  const noteUsers = partialData.note?.users ?? [];

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
            <TableCell>Name</TableCell>
            <TableCell>Revision</TableCell>
            <TableCell>Selection Start</TableCell>
            <TableCell>Selection End</TableCell>
            <TableCell>Closed At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {noteUsers.map((noteUser, index) => (
            <TableRow key={noteUser?.id ?? index}>
              <TableCell>
                {noteUser?.user?.profile?.displayName ?? <RemoveIcon />}
              </TableCell>
              <TableCell>
                {noteUser?.open?.collabTextEditing?.revision ?? <RemoveIcon />}
              </TableCell>
              <TableCell>
                {noteUser?.open?.collabTextEditing?.latestSelection?.start ?? (
                  <RemoveIcon />
                )}
              </TableCell>
              <TableCell>
                {noteUser?.open?.collabTextEditing?.latestSelection?.end ?? (
                  <RemoveIcon />
                )}
              </TableCell>
              <TableCell>
                {noteUser?.open?.closedAt?.toLocaleTimeString() ?? <RemoveIcon />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}