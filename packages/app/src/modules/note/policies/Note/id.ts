import { FieldPolicy } from '@apollo/client';
import { Note } from '../../../../__generated__/graphql';
import { addNoteReferenceByContentId } from '../../note-by-content-id';

export const id: FieldPolicy<Note['id'], Note['id']> = {
  read(id, { toReference, readField, cache }) {
    const contentId = readField('contentId');
    if (contentId) {
      const noteRef = toReference({
        __typename: 'Note',
        id,
      });
      if (noteRef) {
        addNoteReferenceByContentId(cache, String(contentId), noteRef);
      }
    }

    return id;
  },
};
