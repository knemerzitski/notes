import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { handleNoteError } from '../utils/handle-error';

export const ShareNote = mutationDefinition(
  gql(`
  mutation ShareNote($input: ShareNoteInput!) @persist {
    shareNote(input:  $input) {
      ...ShareNotePayload
    }
  }
`),
  (cache, { errors }, options) => {
    const { variables } = options;
    if (!variables) {
      throw new Error('Expected variables to be defined for mutation "ShareNote"');
    }
    const noteId = variables.input.note.id;
    if (handleNoteError(noteId, cache, errors, options)) {
      return;
    }
  }
);
