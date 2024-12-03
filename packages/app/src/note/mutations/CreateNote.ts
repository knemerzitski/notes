import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';

/**
 * Will acknowledge submitted changes in service
 */
export const CreateNote = mutationDefinition(
  gql(`
  mutation CreateNote($input: CreateNoteInput!) @persist {
    createNote(input: $input) {
      ...CreateNotePayload
    }
  }
`)
);
