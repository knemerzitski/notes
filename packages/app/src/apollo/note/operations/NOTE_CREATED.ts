import { gql } from '../../__generated__/gql';

const NOTE_CREATED = gql(`
  subscription OnNoteCreated  {
    noteCreated {
      note {
        id
        note {
          id
          title
          textContent
        }
      }
    }
  }
`);

export default NOTE_CREATED;
