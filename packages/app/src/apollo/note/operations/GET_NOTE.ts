import transformDocument from '../../../utils/transformDocument';
import { gql } from '../../__generated__/gql';
import { sessionDocumentTransform } from '../../session/directives/session';

const GET_NOTE = gql(`
  query UserNote($id: ID!) {
    userNote(id: $id) @session {
      note {
        id
        title
        textContent
      }
    }
  }
`);

export default () => transformDocument(sessionDocumentTransform, GET_NOTE);
