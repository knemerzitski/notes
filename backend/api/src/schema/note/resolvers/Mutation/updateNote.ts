import type { MutationResolvers } from '../../../types.generated';
import { NoteSchema } from '../../mongoose';

export const updateNote: NonNullable<MutationResolvers['updateNote']> = async (
  _parent,
  { input: { id, title, content } },
  { auth, mongoose, publish }
) => {
  if (!auth) return false;
  const { userId } = auth;

  const NoteModel = mongoose.model<NoteSchema>('Note');

  const updatedNote = await NoteModel.findOneAndUpdate(
    {
      _id: id,
      userId,
    },
    {
      title,
      content,
    }
  );

  await publish('NOTE_UPDATED', {
    noteUpdated: {
      id,
      title,
      content,
    },
  });

  return updatedNote != null;
};
