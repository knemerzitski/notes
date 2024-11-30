import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { handleNoteError } from '../utils/handle-error';

export const TrashUserNoteLink = mutationDefinition(
  gql(`
  mutation TrashUserNoteLink($input: TrashUserNoteLinkInput!) @persist {
    trashUserNoteLink(input: $input) {
      ...TrashUserNoteLinkPayload
    }
  }
`),
  (cache, { errors }, options) => {
    const { variables } = options;
    if (!variables) {
      throw new Error(
        'Expected variables to be defined for mutation "TrashUserNoteLink"'
      );
    }

    const noteId = variables.input.noteId;
    if (handleNoteError(noteId, cache, errors, options)) {
      return;
    }
  }
);
