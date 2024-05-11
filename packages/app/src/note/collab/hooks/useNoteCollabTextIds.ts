import { useSuspenseQuery } from '@apollo/client';
import { gql } from '../../../__generated__/gql';

export const QUERY = gql(`
  query UseNoteCollabTextIds($noteContentId: String!) {
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

export default function useNoteCollabTextIds(noteContentId: string) {
  const { data } = useSuspenseQuery(QUERY, {
    variables: {
      noteContentId,
    },
  });

  return data.note.textFields;
}
