import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { NoteTextFieldName } from '../../__generated__/graphql';
import { useNoteId } from '../context/note-id';

// textField is derived from headText
const _UseTextFieldValue_NoteFragment = gql(`
  fragment UseTextFieldValue_NoteFragment on Note {
    id
    collabText {
      id
      headText {
        revision
        changeset
      }
    }
  }
`);

const UseTextFieldValue_Query = gql(`
  query UseTextFieldValue_Query($id: ObjectID!, $name: NoteTextFieldName!) {
    userNoteLink(by: { noteId: $id }) @client {
      id
      note {
        id
        textField(name: $name) {
          value
        }
      }
    }
  }
`);

export function useTextFieldValue(fieldName: NoteTextFieldName) {
  const noteId = useNoteId();

  const { data } = useQuery(UseTextFieldValue_Query, {
    variables: {
      id: noteId,
      name: fieldName,
    },
  });

  if (!data) {
    return null;
  }

  return data.userNoteLink.note.textField.value;
}
