import { gql } from '../../__generated__/gql';

const NOTE_CREATED = gql(`
  subscription OnNoteCreated  {
    noteCreated {
      id
      title
      content
    }
  }
`);

export default NOTE_CREATED;
