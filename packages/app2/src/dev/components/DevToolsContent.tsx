import { Box, Divider } from '@mui/material';
import { OngoingOperationsCountsTable } from './OngoingOperationsCountsTable';
import { SimulateOfflineToggleButton } from './SimulateOfflineToggleButton';
import { DashCard } from './DashCard';
import { UnsavedCollabServiceNotesTable } from './UnsavedCollabServiceNotesTable';
import { PendingNotesTable } from './PendingNotesTable';
import { ExcludedConnectionNotesTable } from './ExcludedConnectionNotesTable';
import { DefaultConnectionNotesTable } from './DefaultConnectionNotesTable';

export function DevToolsContent() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexFlow: 'row wrap',
        gap: 1,
      }}
    >
      <DashCard label="GraphQL Gate">
        <SimulateOfflineToggleButton />
      </DashCard>

      <Divider />

      <DashCard label="Ongoing Operations">
        <OngoingOperationsCountsTable />
      </DashCard>

      <DashCard label="Unsaved CollabServices">
        <UnsavedCollabServiceNotesTable />
      </DashCard>

      <DashCard label="Pending Notes">
        <PendingNotesTable />
      </DashCard>

      <DashCard label="Excluded Connection Notes">
        <ExcludedConnectionNotesTable />
      </DashCard>

      <DashCard label="Default Connection Notes">
        <DefaultConnectionNotesTable />
      </DashCard>
    </Box>
  );
}
