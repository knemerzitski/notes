import { type NoteCollabResolvers } from '../../types.generated';
import {
  CollabText_id_fromNoteQueryFn,
  mapNoteToCollabTextQueryFn,
} from '../../../../services/note/note-collab';

export const NoteCollab: NoteCollabResolvers = {
  text: (parent, _arg, _ctx) => {
    return {
      id: () => CollabText_id_fromNoteQueryFn(parent.query),
      query: mapNoteToCollabTextQueryFn(parent.query),
    };
  },
};
