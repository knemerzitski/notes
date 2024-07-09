import { useMutation } from '@apollo/client';

import { gql } from '../../../../__generated__/gql';
export const MUTATION = gql(`
  mutation UseUpdateNote($input: UpdateNoteInput!)  {
    updateNote(input: $input) {
      patch {
        id
        textFields {
          key
          value {
            id
            newRecord {
              id
              change {
                changeset
                revision
              }
              creatorUserId
              beforeSelection {
                start
                end
              }
              afterSelection {
                start
                end
              }
            }
          }
        }
      }
    }
  }
`);

export default function useUpdateNote() {
  const [updateNote] = useMutation(MUTATION);

  return updateNote;
}
