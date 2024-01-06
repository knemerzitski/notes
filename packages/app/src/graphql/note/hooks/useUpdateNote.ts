import { useMutation } from '@apollo/client';

import { gql } from '../../../local-state/__generated__/gql';
import { Note } from '../../../local-state/__generated__/graphql';

const MUTATION = gql(`
  mutation UseUpdateNote($input: UpdateNoteInput!)  {
    updateNote(input: $input) {
      note {
        id
        title
        textContent
      }
    }
  }
`);

type PartialNote = Pick<Note, 'id' | 'title' | 'textContent'>;

export default function useUpdateNote(): (
  note: PartialNote
) => Promise<PartialNote | undefined> {
  const [updateNote] = useMutation(MUTATION);

  return async (note) => {
    const { data } = await updateNote({
      variables: {
        input: {
          id: String(note.id),
          patch: {
            title: note.title,
            textContent: note.textContent,
          },
        },
      },
      optimisticResponse: {
        updateNote: {
          note: {
            id: note.id,
            title: note.title,
            textContent: note.textContent,
          },
        },
      },
      // TODO update cache
    });

    return data?.updateNote.note;
  };
}
