import { useQuery } from '@apollo/client';

import { Maybe } from '~utils/types';

import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';
import { useNoteTextFieldName } from '../context/note-text-field-name';
import { NoteTextFieldEditor } from '../external-state/note';

const UseNoteTextFieldEditor_Query = gql(`
  query UseNoteTextFieldEditor_Query($by: NoteByInput!, $name: NoteTextFieldName!) {
    note(by: $by) {
      id
      textField(name: $name) {
        editor
      }
    }
  }
`);

export function useNoteTextFieldEditor(nullable: true): Maybe<NoteTextFieldEditor>;
export function useNoteTextFieldEditor(nullable?: false): NoteTextFieldEditor;
export function useNoteTextFieldEditor(nullable?: boolean): Maybe<NoteTextFieldEditor> {
  const noteId = useNoteId();
  const fieldName = useNoteTextFieldName();
  const { data } = useQuery(UseNoteTextFieldEditor_Query, {
    variables: {
      by: {
        id: noteId,
      },
      name: fieldName,
    },
    fetchPolicy: 'cache-only',
  });

  if (!data && !nullable) {
    throw new Error(`Failed to query editor for note "${noteId}" field "${fieldName}"`);
  }

  return data?.note.textField.editor;
}
