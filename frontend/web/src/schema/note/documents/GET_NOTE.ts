import transformDocument from '../../../utils/transformDocument';
import { gql } from '../../__generated__/gql';
import { sessionDocumentTransform } from '../../session/directives/session';

const GET_NOTE = gql(`
  query Note($id: String!) {
    note(id: $id) @session {
      id
      title
      content
    }
  }
`);

export default () => transformDocument(sessionDocumentTransform, GET_NOTE);
