import { ReactNode, createContext, useContext } from 'react';

const NoteIdContext = createContext<string | null>(null);

export function useNoteId() {
  const ctx = useContext(NoteIdContext);
  if (ctx === null) {
    throw new Error('useNoteId() requires context <NoteIdProvider>');
  }
  return ctx;
}

interface NoteIdProviderProps {
  noteId: string;
  children: ReactNode;
}

export default function NoteIdProvider({ noteId, children }: NoteIdProviderProps) {
  return <NoteIdContext.Provider value={noteId}>{children}</NoteIdContext.Provider>;
}
