import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { handleNoteError } from '../utils/handle-error';

export const DeleteShareNote = mutationDefinition(
  gql(`
  mutation DeleteShareNote($input: DeleteShareNoteInput!) @persist {
    deleteShareNote(input:  $input) {
      ...DeleteShareNotePayload
    }
  }
`),
  (cache, { errors }, options) => {
    const { variables } = options;
    if (!variables) {
      throw new Error('Expected variables to be defined for mutation "ShareNote"');
    }
    const noteId = variables.input.note.id;
    if (handleNoteError(variables.input.authUser.id, noteId, cache, errors)) {
      return;
    }
  }
);
