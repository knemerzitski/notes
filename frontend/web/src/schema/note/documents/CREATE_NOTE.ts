import transformDocument from '../../../utils/transformDocument';
import { gql } from '../../__generated__/gql';
import { sessionDocumentTransform } from '../../session/directives/session';

const CREATE_NOTE = gql(`
  mutation CreateNote($input: CreateNoteInput!)  {
    createNote(input: $input) @session {
      id
      title
      content
    }
  }
`);

export default () => transformDocument(sessionDocumentTransform, CREATE_NOTE);
