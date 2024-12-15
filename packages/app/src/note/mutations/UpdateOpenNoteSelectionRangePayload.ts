import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';

// TODO a base note fragment, what data to fetch?

export const UpdateOpenNoteSelectionRangePayload = mutationDefinition(
  gql(`
  fragment UpdateOpenNoteSelectionRangePayload on UpdateOpenNoteSelectionRangePayload {
    publicUserNoteLink {
      id
      open {
        collabTextEditing {
          revision
          latestSelection {
            start
            end
          }
        }
      }
    }
  }
`),
  (_cache, { data }) => {
    if (!data) {
      return;
    }
  }
);
