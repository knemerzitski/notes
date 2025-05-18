import { useQuery } from '@apollo/client';

import { Maybe } from '../../../../utils/src/types';

import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';
import { useNoteTextFieldName } from '../context/note-text-field-name';
import { NoteTextFieldEditor } from '../types';
import { useUserId } from '../../user/context/user-id';

const UseNoteTextFieldEditor_Query = gql(`
  query UseNoteTextFieldEditor_Query($userBy: UserByInput!, $noteBy: NoteByInput!, $fieldName: NoteTextFieldName!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        textField(name: $fieldName) {
          editor
        }
      }
    }
  }
`);

export function useNoteTextFieldEditor(nullable: true): Maybe<NoteTextFieldEditor>;
export function useNoteTextFieldEditor(nullable?: false): NoteTextFieldEditor;
export function useNoteTextFieldEditor(nullable?: boolean): Maybe<NoteTextFieldEditor> {
  const userId = useUserId();
  const noteId = useNoteId();
  const fieldName = useNoteTextFieldName();
  const { data } = useQuery(UseNoteTextFieldEditor_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
      fieldName,
    },
    fetchPolicy: 'cache-only',
  });

  if (!data && !nullable) {
    throw new Error(`Failed to query editor for note "${noteId}" field "${fieldName}"`);
  }

  return data?.signedInUser.noteLink.textField.editor;
}
