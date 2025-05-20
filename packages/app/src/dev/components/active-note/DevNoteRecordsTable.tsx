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

import { isDefined } from '../../../../../utils/src/type-guards/is-defined';

import { PartialDeep } from '../../../../../utils/src/types';

import { Changeset } from '../../../../../collab2/src';

import { gql } from '../../../__generated__';
import { DevNoteRecordsTableQueryQuery } from '../../../__generated__/graphql';
import { useNoteId } from '../../../note/context/note-id';

const DevNoteRecordsTable_Query = gql(`
  query DevNoteRecordsTable_Query($by: NoteByInput!) {
    note(by: $by){
      id
      collabText {
        id
        recordConnection {
          edges {
            node {
              id
              revision
              changeset
              createdAt
            }
          }
        }
      }
    }
  }
`);

export function DevNoteRecordsTable() {
  const noteId = useNoteId();

  const { data } = useQuery(DevNoteRecordsTable_Query, {
    variables: {
      by: {
        id: noteId,
      },
    },
    fetchPolicy: 'cache-only',
    returnPartialData: true,
  });

  const partialData: PartialDeep<DevNoteRecordsTableQueryQuery, Changeset> | undefined =
    data;
  if (!partialData) {
    return null;
  }

  const collabText = partialData.note?.collabText;

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
            <TableCell>Revision</TableCell>
            <TableCell>Changeset</TableCell>
            <TableCell>Created At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {collabText?.recordConnection?.edges
            ?.map((edge) => edge?.node)
            .filter(isDefined)
            .map((node, index) => (
              <TableRow key={node.id ?? index}>
                <TableCell>{node.revision ?? <RemoveIcon />}</TableCell>
                <TableCell>{node.changeset?.toString() ?? <RemoveIcon />}</TableCell>
                <TableCell>{node.createdAt?.toString() ?? <RemoveIcon />}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
