import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { handleNoteError } from '../utils/handle-error';

export const DeleteNote = mutationDefinition(
  gql(`
  mutation DeleteNote($input: DeleteNoteInput!) @persist {
    deleteNote(input: $input) {
      ...DeleteNotePayload
    }
  }
`),
  (cache, { errors }, options) => {
    const { variables } = options;
    if (!variables) {
      throw new Error('Expected variables to be defined for mutation "DeleteNote"');
    }

    const noteId = variables.input.note.id;
    if (handleNoteError(noteId, cache, errors, options)) {
      return;
    }
  }
);
