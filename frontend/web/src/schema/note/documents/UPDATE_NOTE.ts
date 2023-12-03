import transformDocument from '../../../utils/transformDocument';
import { gql } from '../../__generated__/gql';
import { sessionDocumentTransform } from '../../session/directives/session';

const UPDATE_NOTE = gql(`
  mutation UpdateNote($input: UpdateNoteInput!)  {
    updateNote(input: $input) @session
  }
`);

export default () => transformDocument(sessionDocumentTransform, UPDATE_NOTE);
