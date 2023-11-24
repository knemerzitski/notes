import type { QueryResolvers } from '../../../types.generated';
import { NoteSchema } from '../../mongoose';

export const note: NonNullable<QueryResolvers['note']> = async (
  _parent,
  { id },
  { auth: auth, mongoose }
) => {
  if (!auth) return null;
  const { userId } = auth;

  const NoteModel = mongoose.model<NoteSchema>('Note');

  const note = await NoteModel.findOne({
    _id: id,
    userId,
  });
  if (!note) return null;

  return {
    id: note._id.toString(),
    userId: note.userId.toString(),
    title: note.title,
    content: note.content,
  };
};
