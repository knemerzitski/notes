import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { NoteTextFieldName } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
import { useNoteId } from '../context/note-id';

// textField is derived from headText
const _UseTextFieldValue_NoteFragment = gql(`
  fragment UseTextFieldValue_NoteFragment on Note {
    id
    collabText {
      id
      headRecord {
        revision
        text
      }
    }
  }
`);

const UseTextFieldValue_Query = gql(`
  query UseTextFieldValue_Query($userBy: UserByInput!, $noteBy: NoteByInput!, $fieldName: NoteTextFieldName!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        textField(name: $fieldName) {
          value
        }
      }
    }    
  }
`);

export function useTextFieldValue(fieldName: NoteTextFieldName) {
  const userId = useUserId();
  const noteId = useNoteId();

  const { data } = useQuery(UseTextFieldValue_Query, {
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

  if (!data) {
    return null;
  }

  return data.signedInUser.noteLink.textField.value;
}
