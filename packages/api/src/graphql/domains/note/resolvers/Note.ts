import { Note_id_fromQueryFn } from '../../../../services/note/note-id';
import type { NoteResolvers } from '../../types.generated';

export const Note: Pick<NoteResolvers, 'id'> = {
  id: (parent, _arg, _ctx) => {
    return Note_id_fromQueryFn(parent.query);
  },
};
