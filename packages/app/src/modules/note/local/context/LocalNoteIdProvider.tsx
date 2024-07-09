import { ReactNode, createContext, useContext } from 'react';

const LocalNoteIdContext = createContext<string | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useLocalNoteId() {
  const ctx = useContext(LocalNoteIdContext);
  if (ctx === null) {
    throw new Error('useLocalNoteId() requires context <LocalNoteIdProvider>');
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocalNoteIdMaybe() {
  return useContext(LocalNoteIdContext);
}

interface LocalNoteIdProviderProps {
  localNoteId: string;
  children: ReactNode;
}

export default function LocalNoteIdProvider({
  localNoteId,
  children,
}: LocalNoteIdProviderProps) {
  return (
    <LocalNoteIdContext.Provider value={localNoteId}>
      {children}
    </LocalNoteIdContext.Provider>
  );
}
