import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { deleteNoteShareAccess } from '../models/note/delete-note-share-access';

export const DeleteShareNotePayload = mutationDefinition(
  gql(`
  fragment DeleteShareNotePayload on DeleteShareNotePayload {
    shareAccessId
    note {
      id
    }
  }
`),
  (cache, { data }) => {
    if (!data) {
      return;
    }

    deleteNoteShareAccess(data.note.id, cache);
  }
);
