import { ReactNode, createContext, useCallback, useContext, useState } from 'react';
import { CollabEditor } from '~collab/client/collab-editor';

const FocusedEditorContext = createContext<CollabEditor | null>(null);
const SetFocusedEditorContext = createContext<
  ((newFocusEditor: CollabEditor) => void) | null
>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useFocusedEditor() {
  const ctx = useContext(FocusedEditorContext);
  if (ctx === null) {
    throw new Error('useFocusedEditor() requires context <FocusedEditorProvider>');
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSetFocusedEditor() {
  const ctx = useContext(SetFocusedEditorContext);
  if (ctx === null) {
    throw new Error('useSetFocusedEditor() requires context <FocusedEditorProvider>');
  }
  return ctx;
}

interface FocusedEditorProviderProps {
  initialEditor: CollabEditor;
  children: ReactNode;
}

export default function FocusedEditorProvider({
  children,
  initialEditor,
}: FocusedEditorProviderProps) {
  const [focusedEditor, setFocusedEditor] = useState<CollabEditor>(initialEditor);

  const setEditor = useCallback((newFocusedEditor: CollabEditor) => {
    setFocusedEditor(newFocusedEditor);
  }, []);

  return (
    <FocusedEditorContext.Provider value={focusedEditor}>
      <SetFocusedEditorContext.Provider value={setEditor}>
        {children}
      </SetFocusedEditorContext.Provider>
    </FocusedEditorContext.Provider>
  );
}
