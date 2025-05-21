import { createContext, ReactNode, useContext } from 'react';

import { NoteCollabServiceManager } from '../types';

const NoteCollabServiceManagerContext = createContext<NoteCollabServiceManager | null>(
  null
);

export function useCollabServiceManager(): NoteCollabServiceManager {
  const ctx = useContext(NoteCollabServiceManagerContext);
  if (ctx === null) {
    throw new Error(
      'useCollabServiceManager() requires context <CollabServiceManagerProvider>'
    );
  }
  return ctx;
}

export function CollabServiceManagerProvider({
  context,
  children,
}: {
  context: NoteCollabServiceManager;
  children: ReactNode;
}) {
  return (
    <NoteCollabServiceManagerContext.Provider value={context}>
      {children}
    </NoteCollabServiceManagerContext.Provider>
  );
}
