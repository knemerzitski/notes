import { ReactNode } from '@tanstack/react-router';

import { ProcessNoteUserOperations } from './ProcessNoteUserOperations';
import { ProcessPendingNotesOnce } from './ProcessPendingNotesOnce';
import { UnsavedCollabServices } from './UnsavedCollabServices';

export function AppNoteModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <UnsavedCollabServices />
      <ProcessNoteUserOperations />
      <ProcessPendingNotesOnce />
      {children}
    </>
  );
}
