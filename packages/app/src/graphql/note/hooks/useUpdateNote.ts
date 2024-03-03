import { useMutation } from '@apollo/client';

import { gql } from '../../../__generated__/gql';
import { UpdateNoteInput, UpdateNotePayload } from '../../../__generated__/graphql';

const MUTATION = gql(`
  mutation UseUpdateNote($input: UpdateNoteInput!)  {
    updateNote(input: $input) {
      id
      patch {
        title {
          changeset
          revision
        }
        content {
          changeset
          revision
        }
      }
    }
  }
`);

export default function useUpdateNote(): (
  input: UpdateNoteInput
) => Promise<UpdateNotePayload | undefined> {
  const [updateNote] = useMutation(MUTATION);

  return async (input) => {
    const { data } = await updateNote({
      variables: {
        input,
      },
    });

    return data?.updateNote;
  };
}
