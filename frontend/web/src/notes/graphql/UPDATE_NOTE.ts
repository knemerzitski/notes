import { gql } from '../../__generated__/gql';

const UPDATE_NOTE = gql(`
  mutation UpdateNote($note: UpdateNote!)  {
    updateNote(note: $note) @local
  }
`);

export default UPDATE_NOTE;
