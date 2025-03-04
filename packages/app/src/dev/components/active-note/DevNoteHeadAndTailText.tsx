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

import { Changeset } from '../../../../../collab/src/changeset';
import { PartialDeep } from '../../../../../utils/src/types';

import { gql } from '../../../__generated__';
import { DebugNoteHeadTextQueryQuery } from '../../../__generated__/graphql';
import { useNoteId } from '../../../note/context/note-id';

const DebugNoteHeadText_Query = gql(`
  query DebugNoteHeadText_Query($by: NoteByInput!) {
    note(by: $by){
      id
      collabText {
        id
        headText {
          revision
          changeset
        }
        tailText {
          revision
          changeset
        }
      }
    }
  }
`);

export function DevNoteHeadAndTailText() {
  const noteId = useNoteId();

  const { data } = useQuery(DebugNoteHeadText_Query, {
    variables: {
      by: {
        id: noteId,
      },
    },
    fetchPolicy: 'cache-only',
    returnPartialData: true,
  });

  const partialData: PartialDeep<DebugNoteHeadTextQueryQuery, Changeset> | undefined =
    data;
  if (!partialData) {
    return null;
  }

  const collabText = partialData.note?.collabText;
  const headText = collabText?.headText;
  const tailText = collabText?.tailText;

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
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>{tailText?.revision ?? <RemoveIcon />}</TableCell>
            <TableCell>{tailText?.changeset?.toString() ?? <RemoveIcon />}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{headText?.revision ?? <RemoveIcon />}</TableCell>
            <TableCell>{headText?.changeset?.toString() ?? <RemoveIcon />}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
