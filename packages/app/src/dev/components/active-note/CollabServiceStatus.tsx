import { useQuery } from '@apollo/client';
import { gql } from '../../../__generated__';
import { useNoteId } from '../../../note/context/note-id';
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { useCollabService } from '../../../note/hooks/useCollabService';
import { useEffect, useState } from 'react';

export function CollabServiceStatus() {
  const [_renderCounter, setRenderCounter] = useState(0);
  const collabService = useCollabService(true);

  useEffect(
    () =>
      collabService?.eventBus.on(
        [
          'appliedTypingOperation',
          'headRevisionChanged',
          'handledExternalChanges',
          'submittedRecord',
        ],
        () => {
          setRenderCounter((prev) => prev + 1);
        }
      ),
    [collabService]
  );

  if (!collabService) {
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
            <TableCell>Property</TableCell>
            <TableCell>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Head Revision</TableCell>
            <TableCell>{collabService.headRevision}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>History Entries</TableCell>
            <TableCell>{collabService.history.entries.length}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Server</TableCell>
            <TableCell>{collabService.client.server.toString()}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Submitted</TableCell>
            <TableCell>{collabService.client.submitted.toString()}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Local</TableCell>
            <TableCell>{collabService.client.local.toString()}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>View</TableCell>
            <TableCell>{collabService.client.view.toString()}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
