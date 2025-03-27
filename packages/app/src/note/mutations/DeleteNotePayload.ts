import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { deleteNote } from '../models/note/delete';

export const DeleteNotePayload = mutationDefinition(
  gql(`
  fragment DeleteNotePayload on DeleteNotePayload {
    userNoteLinkId
  }
`),
  (cache, { data }) => {
    if (!data?.userNoteLinkId) {
      return;
    }

    deleteNote(data.userNoteLinkId, cache);
  }
);
