import { ReactNode } from '@tanstack/react-router';
import { UnsavedNotesCollabEditing } from './UnsavedNotesCollabEditing';
import { ProcessNoteUserOperations } from './ProcessNoteUserOperations';

export function AppNoteModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <UnsavedNotesCollabEditing />
      <ProcessNoteUserOperations />
      {children}
    </>
  );
}
