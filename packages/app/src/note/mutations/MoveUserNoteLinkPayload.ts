import { gql } from '../../__generated__';
import { UserNoteLinkByInput } from '../../__generated__/graphql';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { moveNoteInConnection } from '../models/note-connection/move';

export const MoveUserNoteLinkPayload = mutationDefinition(
  gql(`
  fragment MoveUserNoteLinkPayload on MoveUserNoteLinkPayload {
    location {
      categoryName
      anchorUserNoteLink {
        id
      }
      anchorPosition
    }
    userNoteLink {
      id
      deletedAt
      categoryName
    }
  }
`),
  (cache, { data }) => {
    if (!data) {
      return;
    }

    const noteLink = data.userNoteLink;
    const noteBy: UserNoteLinkByInput = {
      id: noteLink.id,
    };

    moveNoteInConnection(noteBy, data.location, cache);
  }
);
