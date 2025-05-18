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
        headRecord {
          revision
          text
        }
        tailRecord {
          revision
          text
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

  const partialData: PartialDeep<DebugNoteHeadTextQueryQuery> | undefined = data;
  if (!partialData) {
    return null;
  }

  const collabText = partialData.note?.collabText;
  const headRecord = collabText?.headRecord;
  const tailRecord = collabText?.tailRecord;

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
            <TableCell>Text</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>{tailRecord?.revision ?? <RemoveIcon />}</TableCell>
            <TableCell>{tailRecord?.text ?? <RemoveIcon />}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{headRecord?.revision ?? <RemoveIcon />}</TableCell>
            <TableCell>{headRecord?.text ?? <RemoveIcon />}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
