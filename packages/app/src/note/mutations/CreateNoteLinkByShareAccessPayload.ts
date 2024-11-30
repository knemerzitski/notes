import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { addNoteToConnection } from '../models/note-connection/add';

// TODO a base note fragment, what data to fetch?

export const CreateNoteLinkByShareAccessPayload = mutationDefinition(
  gql(`
  fragment CreateNoteLinkByShareAccessPayload on CreateNoteLinkByShareAccessPayload {
    userNoteLink {
      id
      note {
        id
      }
      ...NoteCard_UserNoteLinkFragment
    }
  }
`),
  (cache, { data }) => {
    if (!data) {
      return;
    }

    addNoteToConnection(
      {
        userNoteLinkId: data.userNoteLink.id,
      },
      cache
    );
  }
);
