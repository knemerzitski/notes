import { ReactNode } from '@tanstack/react-router';
import { UnsavedCollabServices } from './UnsavedCollabServices';
import { ProcessNoteUserOperations } from './ProcessNoteUserOperations';
import { ProcessPendingNotesOnce } from './ProcessPendingNotesOnce';

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
