import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

interface ModifyActiveNotesContextProps {
  add(noteId: string): void;
  remove(noteId: string): void;
}

const ModifyActiveNotesContext = createContext<ModifyActiveNotesContextProps | null>(
  null
);

export function useModifyActiveNotes() {
  const ctx = useContext(ModifyActiveNotesContext);
  if (ctx === null) {
    throw new Error('useModifyActiveNotes() requires context <ActiveNotesProvider>');
  }
  return ctx;
}

const ActiveNotesContext = createContext<string[] | null>(null);

export function useActiveNotes() {
  const ctx = useContext(ActiveNotesContext);
  if (ctx === null) {
    throw new Error('useActiveNotes() requires context <ActiveNotesProvider>');
  }
  return ctx;
}

interface ActiveNotesProviderProps {
  children: ReactNode;
}

export default function ActiveNotesProvider({ children }: ActiveNotesProviderProps) {
  const [activeNotesSet, setActiveNotesSet] = useState<Set<string>>(new Set());

  const activeNotes = useMemo(() => [...activeNotesSet], [activeNotesSet]);

  const add = useCallback((noteId: string) => {
    setActiveNotesSet((prev) => (prev.has(noteId) ? prev : new Set([...prev, noteId])));
  }, []);

  const remove = useCallback((noteId: string) => {
    setActiveNotesSet((prev) => {
      if (!prev.has(noteId)) {
        return prev;
      }

      const cpy = new Set(prev);
      cpy.delete(noteId);
      return cpy;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      add,
      remove,
    }),
    [add, remove]
  );

  return (
    <ModifyActiveNotesContext.Provider value={contextValue}>
      <ActiveNotesContext.Provider value={activeNotes}>
        {children}
      </ActiveNotesContext.Provider>
    </ModifyActiveNotesContext.Provider>
  );
}
