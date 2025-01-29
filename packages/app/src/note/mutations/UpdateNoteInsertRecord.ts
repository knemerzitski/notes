import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { handleNoteError } from '../utils/handle-error';

export const UpdateNoteInsertRecord = mutationDefinition(
  gql(`
    mutation UpdateNoteInsertRecord($input: UpdateNoteInsertRecordInput!) @persist {
      updateNoteInsertRecord(input: $input) {
        ...UpdateNoteInsertRecordPayload
      }
    }
  `),
  (cache, { errors }, options) => {
    const { variables } = options;
    if (!variables) {
      throw new Error(
        'Expected variables to be defined for mutation "UpdateNoteInsertRecord"'
      );
    }
    const noteId = variables.input.note.id;
    if (handleNoteError(noteId, cache, errors, options)) {
      return;
    }
  }
);
