import { gql } from '../../__generated__/gql';

const INSERT_NOTE = gql(`
  mutation InsertNote($title: String!, $content: String!)  {
    insertNote(title: $title, content: $content) @local {
      id
      title
      content
    }
  }
`);

export default INSERT_NOTE;
