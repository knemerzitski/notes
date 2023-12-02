import type { MutationResolvers, Note } from '../../../types.generated';
import { NoteSchema } from '../../mongoose';
import { publishNoteUpdated } from '../Subscription/noteUpdated';

export const updateNote: NonNullable<MutationResolvers['updateNote']> = async (
  _parent,
  { input: { id, title, content } },
  ctx
) => {
  const { auth, mongoose } = ctx;

  if (!auth) return false;
  const { userId } = auth;

  const NoteModel = mongoose.model<NoteSchema>('Note');

  const updatedNoteModel = await NoteModel.findOneAndUpdate(
    {
      _id: id,
      userId,
    },
    {
      title,
      content,
    }
  );

  if (!updatedNoteModel) return false;

  const updatedNote: Note = {
    id,
    //userId,
    title,
    content,
  };

  await publishNoteUpdated(ctx, updatedNote);

  return true;
};
