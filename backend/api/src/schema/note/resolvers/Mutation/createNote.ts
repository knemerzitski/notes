import type { MutationResolvers, Note } from '../../../types.generated';
import { NoteSchema } from '../../mongoose';
import { publishNoteCreated } from '../Subscription/noteCreated';

export const createNote: NonNullable<MutationResolvers['createNote']> = async (
  _parent,
  { input: { title, content } },
  ctx
) => {
  const { auth, mongoose } = ctx;

  if (!auth) return null;
  const { userId } = auth;

  const NoteModel = mongoose.model<NoteSchema>('Note');

  const newNoteModel = new NoteModel({
    userId: userId,
    title,
    content,
  });
  await newNoteModel.save();

  const newNote: Note = {
    id: newNoteModel._id.toString(),
    userId: newNoteModel.userId.toString(),
    title: newNoteModel.title,
    content: newNoteModel.content,
  };

  await publishNoteCreated({ ...ctx, auth }, newNote);

  return newNote;
};
