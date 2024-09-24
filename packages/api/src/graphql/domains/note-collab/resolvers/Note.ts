import {
  CollabText_id_fromNoteQueryFn,
  mapNoteToCollabTextQueryFn,
} from '../../../../services/note/note-collab';
import type { NoteResolvers } from '../../types.generated';

export const Note: Pick<NoteResolvers, 'collabText'> = {
  collabText: (parent, _arg, _ctx) => {
    return {
      id: () => CollabText_id_fromNoteQueryFn(parent.query),
      query: mapNoteToCollabTextQueryFn(parent.query),
    };
  },
};
