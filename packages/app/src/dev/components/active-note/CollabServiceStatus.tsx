import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';

import { useEffect, useState } from 'react';

import { useCollabService } from '../../../note/hooks/useCollabService';

export function CollabServiceStatus() {
  const [_renderCounter, setRenderCounter] = useState(0);
  const collabService = useCollabService();

  useEffect(
    () =>
      collabService.on(
        [
          'localTyping:applied',
          'serverRevision:changed',
          'externalTyping:applied',
          'submittedChanges:have',
        ],
        () => {
          setRenderCounter((prev) => prev + 1);
        }
      ),
    [collabService]
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
            <TableCell>Property</TableCell>
            <TableCell>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Server Revision</TableCell>
            <TableCell>{collabService.serverRevision}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>History Size</TableCell>
            <TableCell>{collabService.historySize}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Server</TableCell>
            <TableCell>{collabService.serverText.toString()}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Submitted</TableCell>
            <TableCell>{collabService.submittedChanges.toString()}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Local</TableCell>
            <TableCell>{collabService.localChanges.toString()}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>View</TableCell>
            <TableCell>{collabService.viewText}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
