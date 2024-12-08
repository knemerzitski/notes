import { DashCard } from './DashCard';
import { DashRow } from './DashRow';
import { CollabServiceStatus } from './active-note/CollabServiceStatus';
import { CurrentNoteId } from './active-note/CurrentNoteId';
import { DevNoteHeadAndTailText } from './active-note/DevNoteHeadAndTailText';
import { DevNoteRecordsTable } from './active-note/DevNoteRecordsTable';
import { DevNoteUsers } from './active-note/DevNoteUsers';
import { PrintLogCollabService } from './active-note/PrintLogCollabService';

export function ActiveNoteDashCards() {
  return (
    <>
      <DashRow>
        <DevNoteUsers />
      </DashRow>

      <DashRow>
        <DashCard label="Note Id">
          <CurrentNoteId />
        </DashCard>
      </DashRow>

      <DashRow>
        <DashCard label="Collab Service Status">
          <CollabServiceStatus />
        </DashCard>
      </DashRow>

      <DashRow>
        <DashCard label="Log Collab Service">
          <PrintLogCollabService />
        </DashCard>
      </DashRow>

      <DashRow>
        <DashCard label="Cached Records">
          <DevNoteRecordsTable />
        </DashCard>

        <DashCard label="Cached Head And Tail Text">
          <DevNoteHeadAndTailText />
        </DashCard>
      </DashRow>
    </>
  );
}
