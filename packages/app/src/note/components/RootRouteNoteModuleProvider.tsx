import { ReactNode } from 'react';

import { ClearSelectedNotesOnRouteChange } from './ClearSelectedNotesOnRouteChange';

export function RootRouteNoteModuleProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <ClearSelectedNotesOnRouteChange />

      {children}
    </>
  );
}
