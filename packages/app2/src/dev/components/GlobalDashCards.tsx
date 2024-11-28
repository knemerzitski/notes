import { Divider } from '@mui/material';
import { OngoingOperationsCountsTable } from './global/OngoingOperationsCountsTable';
import { SimulateOfflineToggleButton } from './global/SimulateOfflineToggleButton';
import { DashCard } from './DashCard';
import { UnsavedCollabServiceNotesTable } from './global/UnsavedCollabServiceNotesTable';
import { PendingNotesTable } from './global/PendingNotesTable';
import { ExcludedConnectionNotesTable } from './global/ExcludedConnectionNotesTable';
// import { DefaultConnectionNotesTable } from './DefaultConnectionNotesTable';

export function GlobalDashCards() {
  return (
    <>
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

      {/* <DashCard label="Default Connection Notes">
        <DefaultConnectionNotesTable />
      </DashCard> */}
    </>
  );
}
