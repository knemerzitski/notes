import transformDocument from '../../../utils/transformDocument';
import { gql } from '../../__generated__/gql';
import { sessionDocumentTransform } from '../../session/directives/session';

const DELETE_NOTE = gql(`
  mutation DeleteUserNote($input: DeleteNoteInput!) {
    deleteUserNote(input: $input) @session {
      deleted
    }
  }
`);

export default () => transformDocument(sessionDocumentTransform, DELETE_NOTE);
