import { CurrentNoteId } from './active-note/CurrentNoteId';
import { DevNoteHeadAndTailText } from './active-note/DevNoteHeadAndTailText';
import { DevNoteRecordsTable } from './active-note/DevNoteRecordsTable';
import { DashCard } from './DashCard';
import { DashRow } from './DashRow';

export function ActiveNoteDashCards() {
  return (
    <>
      <DashRow>
        <DashCard label="Note Id">
          <CurrentNoteId />
        </DashCard>

        <DashCard label="Cached Head And Tail Text">
          <DevNoteHeadAndTailText />
        </DashCard>
      </DashRow>

      <DashRow>
        <DashCard label="Cached Records">
          <DevNoteRecordsTable />
        </DashCard>
      </DashRow>
    </>
  );
}
