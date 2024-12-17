import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { addUserToNote } from '../models/note/add-user';
import { setOpenedNoteActive } from '../models/opened-note/set-active';

export const OpenNoteUserSubscribedEvent = mutationDefinition(
  gql(`
  fragment OpenNoteUserSubscribedEvent on OpenNoteUserSubscribedEvent {
    publicUserNoteLink {
      id
      open {
        closedAt
      }
      user {
        id
        profile {
          displayName
        }
      }
    }
    note {
      id
    }
  }
`),
  (cache, { data }) => {
    if (!data) {
      return;
    }

    addUserToNote(
      data.publicUserNoteLink.id,
      {
        id: data.note.id,
      },
      cache
    );

    // Note opened note flag
    setOpenedNoteActive(data.publicUserNoteLink.id, true, cache);
  }
);
