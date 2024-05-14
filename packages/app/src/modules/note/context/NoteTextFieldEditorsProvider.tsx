import { ReactNode, createContext, useContext } from 'react';
import { CollabEditor } from '~collab/client/collab-editor';
import useHTMLInputCollabEditor from '../../collab/hooks/useHTMLInputCollabEditor';
import { useApolloClient, useSuspenseQuery } from '@apollo/client';
import { getCollabEditor } from '../../collab/hooks/useCollabEditor';
import NoteContentIdProvider from './NoteContentIdProvider';
import { NoteTextFieldEntry, NoteTextField } from '../../../__generated__/graphql';
import { gql } from '../../../__generated__/gql';

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

const QUERY_COLLAB_TEXT = gql(`
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
  const { data } = useSuspenseQuery(QUERY_COLLAB_TEXT, {
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
