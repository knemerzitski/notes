import { ReactNode, createContext, useContext } from 'react';

const NoteContentIdContext = createContext<string | undefined | null>(null);

export function useNoteContentId(nullable: true): string | undefined | null;
export function useNoteContentId(): string;
// eslint-disable-next-line react-refresh/only-export-components
export function useNoteContentId(nullable?: boolean): string | undefined | null {
  const ctx = useContext(NoteContentIdContext);
  if (ctx === null && !nullable) {
    throw new Error('useNoteContentId() requires context <NoteContentIdProvider>');
  }

  return ctx;
}

interface NoteContentIdProviderProps {
  noteContentId?: string;
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
