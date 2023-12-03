import transformDocument from '../../../utils/transformDocument';
import { gql } from '../../__generated__/gql';
import { sessionDocumentTransform } from '../../session/directives/session';

const DELETE_NOTE = gql(`
  mutation DeleteNote($id: ID!) {
    deleteNote(id: $id) @session
  }
`);

export default () => transformDocument(sessionDocumentTransform, DELETE_NOTE);
