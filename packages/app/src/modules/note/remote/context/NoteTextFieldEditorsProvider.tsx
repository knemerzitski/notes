import { ReactNode, createContext, useContext } from 'react';

import { CollabEditor } from '~collab/client/collab-editor';

import { NoteTextFieldEntry, NoteTextField } from '../../../../__generated__/graphql';
import useHTMLInputCollabEditor from '../../../collab/hooks/useHTMLInputCollabEditor';

import FocusedEditorProvider, { useSetFocusedEditor } from './FocusedEditorProvider';

export type NoteCollabTextEditors = (Omit<NoteTextFieldEntry, 'value'> & {
  value: CollabEditor;
})[];

const NoteCollabTextEditorsContext = createContext<NoteCollabTextEditors | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useNoteCollabTextEditors() {
  const ctx = useContext(NoteCollabTextEditorsContext);
  if (ctx === null) {
    throw new Error(
      'useNoteCollabTextEditors() requires context <NoteCollabTextEditorsProvider>'
    );
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNoteTextFieldEditor(fieldName: NoteTextField) {
  const editors = useNoteCollabTextEditors();

  const editorEntry = editors.find((entry) => entry.key === fieldName);
  if (!editorEntry) {
    throw new Error(`Note text field ${fieldName} not found`);
  }

  return editorEntry.value;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNoteTextFieldHTMLInput(fieldName: NoteTextField) {
  const editor = useNoteTextFieldEditor(fieldName);

  const setFocusedEditor = useSetFocusedEditor();

  function handleFocus() {
    setFocusedEditor(editor);
  }

  const inputProps = useHTMLInputCollabEditor(editor);

  return {
    ...inputProps,
    onFocus: handleFocus,
  };
}

export interface NoteTextFieldEditorsProviderProps {
  editors: NoteCollabTextEditors;
  children: ReactNode;
}

export default function NoteTextFieldEditorsProvider({
  editors,
  children,
}: NoteTextFieldEditorsProviderProps) {
  return (
    <NoteCollabTextEditorsContext.Provider value={editors}>
      <FocusedEditorProviderInitialContent>
        {children}
      </FocusedEditorProviderInitialContent>
    </NoteCollabTextEditorsContext.Provider>
  );
}

function FocusedEditorProviderInitialContent({ children }: { children: ReactNode }) {
  const contentEditor = useNoteTextFieldEditor(NoteTextField.CONTENT);

  return (
    <FocusedEditorProvider initialEditor={contentEditor}>
      {children}
    </FocusedEditorProvider>
  );
}
