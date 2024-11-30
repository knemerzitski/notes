import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';

export const ShareNotePayload = mutationDefinition(
  gql(`
  fragment ShareNotePayload on ShareNotePayload {
    note {
      id
      shareAccess {
        id
      }
    }
  }
`),
  (_cache, { data }) => {
    if (!data) {
      return;
    }

    // Don't have to do anything, cache is update automatically
  }
);
