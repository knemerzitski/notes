import { gql } from '../../__generated__/gql';

const NOTE_UPDATED = gql(`
  subscription OnNoteUpdated  {
    noteUpdated {
      id
      patch {
        note {
          title
          textContent
        }
        preferences {
          backgroundColor
        }
      }
    }
  }
`);

export default NOTE_UPDATED;
