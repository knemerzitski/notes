import { useMutation } from '@apollo/client';

import { gql } from '../../../local-state/__generated__/gql';
import { Note } from '../../../local-state/__generated__/graphql';

const MUTATION = gql(`
  mutation UseUpdateNote($input: UpdateNoteInput!)  {
    updateUserNote(input: $input) {
      note {
        note {
          id
          title
          textContent
        }
      }
    }
  }
`);

export default function useUpdateNote(): (note: Note) => Promise<Note | undefined> {
  const [updateNote] = useMutation(MUTATION);

  return async (note) => {
    const { data } = await updateNote({
      variables: {
        input: {
          id: String(note.id),
          patch: {
            note: {
              title: note.title,
              textContent: note.textContent,
            },
          },
        },
      },
      optimisticResponse: {
        updateUserNote: {
          note: {
            note: {
              id: note.id,
              title: note.title,
              textContent: note.textContent,
            },
          },
        },
      },
      // TODO update cache
    });

    return data?.updateUserNote.note.note;
  };
}
