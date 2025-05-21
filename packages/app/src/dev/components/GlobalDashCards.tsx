import { DashCard } from './DashCard';
import { CacheGcButton } from './global/CacheGcButton';
import { CurrentUserId } from './global/CurrentUserId';
import { DebugStorageField } from './global/DebugStorageField';
import { DefaultConnectionNotesTable } from './global/DefaultConnectionNotesTable';
import { OngoingOperationsByNameList } from './global/OngoingOperationsByNameList';
import { OngoingOperationsCountsByTypeTable } from './global/OngoingOperationsCountsByTypeTable';
import { PendingNotesTable } from './global/PendingNotesTable';
import { PrintLogApolloClient } from './global/PrintLogApolloClient';
import { SimulateOfflineToggleButton } from './global/SimulateOfflineToggleButton';
import { UnsavedCollabServiceNotesTable } from './global/UnsavedCollabServiceNotesTable';

export function GlobalDashCards() {
  return (
    <>
      <DashCard label="Debug Logging">
        <DebugStorageField />
      </DashCard>

      <DashCard label="User Id">
        <CurrentUserId />
      </DashCard>

      <DashCard label="Simulate Offline Mode">
        <SimulateOfflineToggleButton />
      </DashCard>

      <DashCard label="Apollo Client">
        <CacheGcButton />
        <PrintLogApolloClient />
      </DashCard>

      <DashCard label="Ongoing Operations">
        <OngoingOperationsCountsByTypeTable />
        <OngoingOperationsByNameList />
      </DashCard>

      <DashCard label="Unsaved CollabServices">
        <UnsavedCollabServiceNotesTable />
      </DashCard>

      <DashCard label="Pending Notes">
        <PendingNotesTable />
      </DashCard>

      <DashCard label="Default Connection Notes">
        <DefaultConnectionNotesTable />
      </DashCard>
    </>
  );
}
