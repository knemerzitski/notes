import { gql } from '../../__generated__/gql';

const UPDATE_NOTE = gql(`
  mutation UpdateNote($input: UpdateNoteInput!)  {
    updateNote(input: $input) @session
  }
`);

export default UPDATE_NOTE;
