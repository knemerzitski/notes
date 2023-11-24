import type { QueryResolvers } from '../../../types.generated';
import { NoteSchema } from '../../mongoose';

export const notes: NonNullable<QueryResolvers['notes']> = async (
  _parent,
  _arg,
  { auth: auth, mongoose }
) => {
  if (!auth) return null;
  const { userId } = auth;

  const NoteModel = mongoose.model<NoteSchema>('Note');

  const notes = [
    ...(await NoteModel.find({
      userId,
    })),
  ].map((note) => ({
    id: note._id.toString(),
    userId: note.userId.toString(),
    title: note.title,
    content: note.content,
  }));

  return notes;
};
