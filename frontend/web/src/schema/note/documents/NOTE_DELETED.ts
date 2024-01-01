import { gql } from '../../__generated__/gql';

const NOTE_DELETED = gql(`
  subscription OnNoteDeleted  {
    noteDeleted {
      id
    }
  }
`);

export default NOTE_DELETED;
