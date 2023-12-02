import { gql } from '../../__generated__/gql';

const NOTE_UPDATED = gql(`
  subscription OnNoteUpdated  {
    noteUpdated {
      id
      title
      content
    }
  }
`);

export default NOTE_UPDATED;
