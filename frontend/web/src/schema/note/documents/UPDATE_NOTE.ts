import transformDocument from '../../../utils/transformDocument';
import { gql } from '../../__generated__/gql';
import { sessionDocumentTransform } from '../../session/directives/session';

const UPDATE_NOTE = gql(`
  mutation UpdateUserNote($input: UpdateNoteInput!)  {
    updateUserNote(input: $input) @session{ 
      note {
        note {
          id
          title
          textContent
        }
      }
    }
  }
`);

export default () => transformDocument(sessionDocumentTransform, UPDATE_NOTE);
