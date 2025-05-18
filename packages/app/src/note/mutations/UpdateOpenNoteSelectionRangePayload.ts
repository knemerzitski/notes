import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';

// TODO a base note fragment, what data to fetch?

export const UpdateOpenNoteSelectionRangePayload = mutationDefinition(
  gql(`
  fragment UpdateOpenNoteSelectionRangePayload on UpdateOpenNoteSelectionRangePayload {
    userNoteLink {
      ...UpdateOpenNoteSelectionRangePayload_UserNoteLinkFragment
    }
  }

  fragment UpdateOpenNoteSelectionRangePayload_UserNoteLinkFragment on UserNoteLink {
    id
    open {
      collabTextEditing {
        revision
        latestSelection
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
