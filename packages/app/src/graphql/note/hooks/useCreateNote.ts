import { useMutation } from '@apollo/client';

import { gql } from '../../../local-state/__generated__/gql';
import { Note } from '../../../local-state/__generated__/graphql';

const MUTATION = gql(`
  mutation UseCreateNote($input: CreateNoteInput!)  {
    createUserNote(input: $input) {
      note {
        id
        note {
          id
          title
          textContent
        }
      }
    }
  }
`);

export default function useCreateNote(): (
  title: string,
  content: string
) => Promise<Note | null> {
  const [createNote] = useMutation(MUTATION);

  return async (title, content) => {
    const {data} = await createNote({
      variables: {
        input: {
          newNote: {
            title,
            textContent: content,
          },
        },
      },
      optimisticResponse: {
        createUserNote: {
          note: {
            id: 'CreateNote',
            note: {
              id: 'CreateNote',
              title,
              textContent: content,
            },
          },
        },
      },
      // cache for notes
      // TODO update cache
    });

    const note = data?.createUserNote?.note.note;

    if (!note) return null;

    return note;
  };
}
