import { useMutation } from '@apollo/client';

import { gql } from '../../../__generated__/gql';
import { Note } from '../../../__generated__/graphql';

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
  const [updateNote, { client }] = useMutation(MUTATION);

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
      context: {
        debounceKey:
          'UseUpdateNote' +
          client.cache.identify({ id: String(note.id), __typename: 'Note' }),
      },
    });

    return data?.updateNote.note;
  };
}
