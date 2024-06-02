import { useMutation } from '@apollo/client';
import { gql } from '../../../__generated__/gql';
import { CreateNoteInput } from '../../../__generated__/graphql';
import { useCallback } from 'react';

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
            recordsConnection {
              records {
                id
                creatorUserId
                change {
                  revision
                  changeset
                }
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
  }
`);

export default function useCreateNote() {
  const [createNote] = useMutation(MUTATION);

  return useCallback(
    async (note: CreateNoteInput['note']) => {
      const { data } = await createNote({
        variables: {
          input: {
            note,
          },
        },
      });

      return data?.createNote?.note;
    },
    [createNote]
  );
}
