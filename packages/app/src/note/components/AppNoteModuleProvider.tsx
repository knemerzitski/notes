import { ReactNode } from '@tanstack/react-router';

import { SelectedNoteIdsProvider } from '../context/selected-note-ids';

import { DeleteExpiredNotes } from './DeleteExpiredNotes';
import { ProcessNoteUserOperations } from './ProcessNoteUserOperations';
import { ProcessPendingNotesOnce } from './ProcessPendingNotesOnce';
import { UnsavedCollabServices } from './UnsavedCollabServices';

export function AppNoteModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <DeleteExpiredNotes localOnly={true} />
      <UnsavedCollabServices />
      <ProcessNoteUserOperations />
      <ProcessPendingNotesOnce />
      <SelectedNoteIdsProvider>{children}</SelectedNoteIdsProvider>
    </>
  );
}
