import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { deleteNoteShareAccess } from '../models/note/set-share-id';

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

    if (!data.shareAccessId) {
      deleteNoteShareAccess(data.note.id, cache);
    }
  }
);
