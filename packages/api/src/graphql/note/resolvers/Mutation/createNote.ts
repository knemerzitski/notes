import { newDocumentInsertion } from '~collab/adapters/mongodb/multi-field-document-server';

import { assertAuthenticated } from '../../../base/directives/auth';
import { publishNoteCreated } from '../Subscription/noteCreated';

import {
  NoteTextField,
  type CreateNotePayload,
  type MutationResolvers,
  type NoteCreatedPayload,
} from './../../../types.generated';

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

  const currentUserId = auth.session.user._id._id;

  const newNote = new model.Note({
    ownerId: currentUserId,
    title: newDocumentInsertion(
      input.note?.textFields?.find((s) => s.key === NoteTextField.TITLE)?.value
        .initialText ?? ''
    ),
    content: newDocumentInsertion(
      input.note?.textFields?.find((s) => s.key === NoteTextField.CONTENT)?.value
        .initialText ?? ''
    ),
  });

  await connection.transaction(async (session) => {
    const newUserNote = new model.UserNote({
      userId: currentUserId,
      notePublicId: newNote.publicId,
    });

    const updateUserPromise = model.User.updateOne(
      {
        _id: currentUserId,
      },
      {
        $push: {
          'notes.category.default.order': newUserNote._id,
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

  const newNotePayload: CreateNotePayload & NoteCreatedPayload = {
    note: {
      id: newNote.publicId,
      textFields: [
        {
          key: NoteTextField.TITLE,
          value: {
            headText: newNote.title.latestText,
            headRevision: newNote.title.latestRevision,
          },
        },
        {
          key: NoteTextField.CONTENT,
          value: {
            headText: newNote.content.latestText,
            headRevision: newNote.content.latestRevision,
          },
        },
      ],
    },
  };

  await publishNoteCreated(ctx, newNotePayload);

  return newNotePayload;
};
