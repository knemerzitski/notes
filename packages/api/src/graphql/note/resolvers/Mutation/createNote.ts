import { assertAuthenticated } from '../../../base/directives/auth';

import type { CreateNotePayload, MutationResolvers } from './../../../types.generated';

export const createNote: NonNullable<MutationResolvers['createNote']> = async (
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
    title: input.note?.title,
    textContent: input.note?.textContent,
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

  const newNotePayload: CreateNotePayload = {
    note: {
      id: newNote.publicId,
      title: newNote.title ?? '',
      textContent: newNote.textContent ?? '',
      preferences: {},
    },
  };

  // TODO fix exception Value provided in ExpressionAttributeNames unused in expressions: keys: {#4}
  //await publishNoteCreated(ctx, newNotePayload);

  return newNotePayload;
};
