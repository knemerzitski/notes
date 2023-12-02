import { gql } from '../../__generated__/gql';

const DELETE_NOTE = gql(`
  mutation DeleteNote($id: ID!) {
    deleteNote(id: $id) @session
  }
`);

export default DELETE_NOTE;
