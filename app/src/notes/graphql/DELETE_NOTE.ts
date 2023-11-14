import { gql } from '../../__generated__/gql';

const DELETE_NOTE = gql(`
  mutation DeleteNote($id: String!) {
    deleteNote(id: $id) @local
  }
`);

export default DELETE_NOTE;
