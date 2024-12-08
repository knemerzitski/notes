import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';

export const UpdateOpenNoteSelectionRange = mutationDefinition(
  gql(`
  mutation UpdateOpenNoteSelectionRange($input: UpdateOpenNoteSelectionRangeInput!) {
    updateOpenNoteSelectionRange(input: $input) {
      ...UpdateOpenNoteSelectionRangePayload
    }
  }
`),
  (_cache, { data }) => {
    if (!data) {
      return;
    }
  }
);
