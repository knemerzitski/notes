import { ReactNode } from '@tanstack/react-router';
import { UnsavedCollabServices } from './UnsavedCollabServices';
import { ProcessNoteUserOperations } from './ProcessNoteUserOperations';

export function AppNoteModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <UnsavedCollabServices />
      <ProcessNoteUserOperations />
      {children}
    </>
  );
}
