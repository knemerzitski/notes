import { useSuspenseQuery } from '@apollo/client';
import { gql } from '../../../__generated__/gql';

const QUERY = gql(`
  query UseNoteCollabTextIds($noteContentId: String!) {
    note(contentId: $noteContentId) {
      id
      textFields {
        key
        value {
          id
        }
      }
    }
  }
`);

export default function useNoteCollabTextFieldIds(noteContentId: string) {
  const { data } = useSuspenseQuery(QUERY, {
    variables: {
      noteContentId,
    },
  });

  return data.note.textFields;
}
