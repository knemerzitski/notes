import type { MutationResolvers, Note } from '../../../types.generated';
import { NoteSchema } from '../../mongoose';

export const createNote: NonNullable<MutationResolvers['createNote']> = async (
  _parent,
  { input: { title, content } },
  { auth, mongoose, publish }
) => {
  if (!auth) return null;
  const { userId } = auth;

  const NoteModel = mongoose.model<NoteSchema>('Note');

  const newNote = new NoteModel({
    userId: userId,
    title,
    content,
  });
  await newNote.save();

  const data: Note = {
    id: newNote._id.toString(),
    userId: newNote.userId.toString(),
    title: newNote.title,
    content: newNote.content,
  };

  // TODO filter publish by user
  await publish('NOTE_CREATED', {
    noteCreated: data,
  });

  return data;
};
