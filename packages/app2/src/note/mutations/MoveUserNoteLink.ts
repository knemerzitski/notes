import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { handleNoteError } from '../utils/handle-error';

// TODO limit with serialize, one move per user
export const MoveUserNoteLink = mutationDefinition(
  gql(`
  mutation MoveUserNoteLink($input: MoveUserNoteLinkInput!) @persist {
    moveUserNoteLink(input: $input) {
      ...MoveUserNoteLinkPayload
    }
  }
`),
  (cache, { errors }, options) => {
    const { variables } = options;
    if (!variables) {
      throw new Error('Expected variables to be defined for mutation "MoveNote"');
    }
    const noteId = variables.input.noteId;
    if (handleNoteError(noteId, cache, errors, options)) {
      return;
    }
  }
);
