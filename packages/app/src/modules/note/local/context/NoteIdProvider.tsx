import { ReactNode, createContext, useContext } from 'react';

const NoteIdContext = createContext<string | null>(null);

export function useNoteId(nullable: true): string | undefined | null;
export function useNoteId(): string;
// eslint-disable-next-line react-refresh/only-export-components
export function useNoteId(nullable?: boolean): string | undefined | null {
  const ctx = useContext(NoteIdContext);
  if (ctx === null && !nullable) {
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
