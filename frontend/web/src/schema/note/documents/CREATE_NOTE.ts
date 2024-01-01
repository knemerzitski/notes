import transformDocument from '../../../utils/transformDocument';
import { gql } from '../../__generated__/gql';
import { sessionDocumentTransform } from '../../session/directives/session';

const CREATE_NOTE = gql(`
  mutation CreateUserNote($input: CreateNoteInput!)  {
    createUserNote(input: $input) @session {
      note {
        id
        note {
          id
          title
          textContent
        }
      }
    }
  }
`);

export default () => transformDocument(sessionDocumentTransform, CREATE_NOTE);
