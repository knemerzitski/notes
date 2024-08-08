import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../../../__generated__/gql';
import { CreateNoteInput } from '../../../../__generated__/graphql';

const MUTATION = gql(`
  mutation UseCreateNote($input: CreateNoteInput!)  {
    createNote(input: $input) {
      note {
        id
        contentId
        isOwner
        categoryName
        sharing {
          id
        }
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

export function useCreateNote() {
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
