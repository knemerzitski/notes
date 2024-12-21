import { ReactNode } from '@tanstack/react-router';

import { ProcessNoteUserOperations } from './ProcessNoteUserOperations';
import { ProcessPendingNotesOnce } from './ProcessPendingNotesOnce';
import { UnsavedCollabServices } from './UnsavedCollabServices';
import { DeleteExpiredNotes } from './DeleteExpiredNotes';

export function AppNoteModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <DeleteExpiredNotes localOnly={true} />
      <UnsavedCollabServices />
      <ProcessNoteUserOperations />
      <ProcessPendingNotesOnce />
      {children}
    </>
  );
}
