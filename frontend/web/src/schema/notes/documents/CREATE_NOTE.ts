import { gql } from '../../__generated__/gql';

const CREATE_NOTE = gql(`
  mutation CreateNote($input: CreateNoteInput!)  {
    createNote(input: $input) @session {
      id
      title
      content
    }
  }
`);

export default CREATE_NOTE;
