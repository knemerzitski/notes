import { ReactNode, createContext, useContext } from 'react';
import { NoteTextField, NoteTextFieldEntry } from '../../__generated__/graphql';
import { CollabEditor } from '~collab/client/collab-editor';
import useHTMLInputCollabEditor from '../../collab/hooks/useHTMLInputCollabEditor';
import { gql } from '../../__generated__/gql';
import { useApolloClient, useSuspenseQuery } from '@apollo/client';
import { getCollabEditor } from '../../collab/hooks/useCollabEditor';
import NoteContentIdProvider from './NoteContentIdProvider';

export type NoteCollabTextEditors = (Omit<NoteTextFieldEntry, 'value'> & {
  value: CollabEditor;
})[];

const NoteCollabTextEditorsContext = createContext<NoteCollabTextEditors | null>(null);

export function useNoteCollabTextEditors() {
  const ctx = useContext(NoteCollabTextEditorsContext);
  if (ctx === null) {
    throw new Error(
      'useNoteCollabTextEditors() requires context <NoteCollabTextEditorsProvider>'
    );
  }
  return ctx;
}

export function useNoteTextFieldEditor(fieldName: NoteTextField) {
  const editors = useNoteCollabTextEditors();

  const editorEntry = editors.find((entry) => entry.key === fieldName);
  if (!editorEntry) {
    throw new Error(`Note text field ${fieldName} not found`);
  }

  return editorEntry.value;
}

export function useNoteTextFieldHTMLInput(fieldName: NoteTextField) {
  const editor = useNoteTextFieldEditor(fieldName);

  return useHTMLInputCollabEditor(editor);
}

export interface NoteTextFieldEditorsProviderProps {
  textFields: NoteCollabTextEditors;
  children: ReactNode;
}

export default function NoteTextFieldEditorsProvider({
  textFields,
  children,
}: NoteTextFieldEditorsProviderProps) {
  return (
    <NoteCollabTextEditorsContext.Provider value={textFields}>
      {children}
    </NoteCollabTextEditorsContext.Provider>
  );
}

const QUERY_COLLAB_IDS = gql(`
  query NoteContentIdToEditorsProvider($noteContentId: String!) {
    note(contentId: $noteContentId) {
      id
      textFields {
        key
        value {
          id
          headText {
            revision
            changeset
          }
        }
      }
    }
  }
`);

interface NoteContentIdToEditorsProviderProps {
  noteContentId: string;
  children: ReactNode;
}

export function NoteContentIdToEditorsProvider({
  noteContentId,
  children,
}: NoteContentIdToEditorsProviderProps) {
  const apolloClient = useApolloClient();
  const { data } = useSuspenseQuery(QUERY_COLLAB_IDS, {
    variables: {
      noteContentId,
    },
  });

  const textFields = data.note.textFields.map(({ key, value }) => ({
    key,
    value: getCollabEditor(apolloClient, String(value.id)),
  }));

  return (
    <NoteContentIdProvider noteContentId={noteContentId}>
      <NoteTextFieldEditorsProvider textFields={textFields}>
        {children}
      </NoteTextFieldEditorsProvider>
    </NoteContentIdProvider>
  );
}
