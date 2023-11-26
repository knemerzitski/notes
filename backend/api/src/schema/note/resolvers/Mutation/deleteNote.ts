import type { MutationResolvers } from '../../../types.generated';
import { NoteSchema } from '../../mongoose';
import { publishNoteDeleted } from '../Subscription/noteDeleted';

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  { id },
  ctx
) => {
  const { auth, mongoose } = ctx;
  if (!auth) return false;
  const { userId } = auth;

  const NoteModel = mongoose.model<NoteSchema>('Note');

  const deletedNoteModel = await NoteModel.findOneAndDelete({
    _id: id,
    userId,
  });

  if (!deletedNoteModel) return false;

  await publishNoteDeleted(ctx, id);

  return true;
};
