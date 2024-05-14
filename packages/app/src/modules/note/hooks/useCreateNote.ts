import { useMutation } from '@apollo/client';
import { gql } from '../../../__generated__/gql';
import { CreateNoteInput } from '../../../__generated__/graphql';

const MUTATION = gql(`
  mutation UseCreateNote($input: CreateNoteInput!)  {
    createNote(input: $input) {
      note {
        id
        contentId
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
  }
`);

export default function useCreateNote() {
  const [createNote] = useMutation(MUTATION);

  return async (note: CreateNoteInput['note']) => {
    const { data } = await createNote({
      variables: {
        input: {
          note,
        },
      },
    });

    return data?.createNote?.note;
  };
}
