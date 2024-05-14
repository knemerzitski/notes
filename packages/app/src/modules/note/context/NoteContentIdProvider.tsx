import { ReactNode, createContext, useContext } from 'react';

const NoteContentIdContext = createContext<string | null>(null);

export function useNoteContentId() {
  const ctx = useContext(NoteContentIdContext);
  if (ctx === null) {
    throw new Error('useNoteContentId() requires context <NoteContentIdProvider>');
  }
  return ctx;
}

export function useNoteContentIdMaybe() {
  return useContext(NoteContentIdContext);
}

interface NoteContentIdProviderProps {
  noteContentId: string;
  children: ReactNode;
}

export default function NoteContentIdProvider({
  noteContentId,
  children,
}: NoteContentIdProviderProps) {
  return (
    <NoteContentIdContext.Provider value={noteContentId}>
      {children}
    </NoteContentIdContext.Provider>
  );
}
