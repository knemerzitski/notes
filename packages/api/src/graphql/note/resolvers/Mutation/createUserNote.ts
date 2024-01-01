import type {
  MutationResolvers,
  NoteCreatedPayload,
} from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';
import { publishNoteCreated } from '../Subscription/noteCreated';

export const createUserNote: NonNullable<MutationResolvers['createUserNote']> = async (
  _parent,
  { input },
  ctx
) => {
  const {
    auth,
    mongoose: { model, connection },
  } = ctx;
  assertAuthenticated(auth);

  const newNote = new model.Note({
    ownerId: auth.session.user._id._id,
    title: input.newNote?.title,
    textContent: input.newNote?.textContent,
  });

  await connection.transaction(async (session) => {
    const newUserNote = new model.UserNote({
      userId: auth.session.user._id._id,
      notePublicId: newNote.publicId,
    });

    const updateUserPromise = model.User.updateOne(
      {
        _id: auth.session.user._id._id,
      },
      {
        $push: {
          'notes.category.default.order': {
            $each: [newUserNote._id],
            $position: 0,
          },
        },
      },
      { session }
    );

    await Promise.all([
      newNote.save({ session }),
      newUserNote.save({ session }),
      updateUserPromise,
    ]);
  });

  const newNotePayload: NoteCreatedPayload = {
    note: {
      id: newNote.publicId,
      note: {
        id: newNote.publicId,
        title: newNote.title ?? '',
        textContent: newNote.textContent ?? '',
      },
      preferences: {},
    },
  };

  await publishNoteCreated(ctx, newNotePayload);

  return newNotePayload;
};
