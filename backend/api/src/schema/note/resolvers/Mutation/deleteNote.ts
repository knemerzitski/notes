import type { MutationResolvers } from '../../../types.generated';
import { NoteSchema } from '../../mongoose';

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  { id },
  { auth, mongoose, publish }
) => {
  if (!auth) return false;
  const { userId } = auth;

  const NoteModel = mongoose.model<NoteSchema>('Note');

  const deletedNote = await NoteModel.findOneAndDelete({
    _id: id,
    userId,
  });

  if (deletedNote) {
    await publish('NOTE_DELETED', {
      noteDeleted: id,
    });
  }

  return deletedNote != null;
};
