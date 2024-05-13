import { FieldPolicy } from '@apollo/client';
import { Note } from '../../../../__generated__/graphql';
import { addNoteReferenceByContentId } from '../../note-by-content-id';

export const id: FieldPolicy<Note['id'], Note['id']> = {
  read(id, { toReference, readField }) {
    const contentId = readField('contentId');
    if (contentId) {
      const noteRef = toReference({
        __typename: 'Note',
        id,
      });
      if (noteRef) {
        addNoteReferenceByContentId(String(contentId), noteRef);
      }
    }

    return id;
  },
};
