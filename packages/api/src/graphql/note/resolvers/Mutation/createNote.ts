import { ObjectId } from 'mongodb';

import { newDocumentInsertion } from '~collab/adapters/mongodb/multi-field-document-server';

import { assertAuthenticated } from '../../../base/directives/auth';
import { publishNoteCreated } from '../Subscription/noteCreated';

import type {
  CreateNotePayload,
  MutationResolvers,
  NoteCreatedPayload,
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

  const currentUserId = ObjectId.createFromBase64(auth.session.user._id);

  const newNote = new model.Note({
    ownerId: currentUserId,
    title: newDocumentInsertion(input.note?.textTitle ?? ''),
    content: newDocumentInsertion(input.note?.textContent ?? ''),
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
      title: {
        latestText: newNote.title.latestText,
        latestRevision: newNote.title.latestRevision,
      },
      content: {
        latestText: newNote.content.latestText,
        latestRevision: newNote.content.latestRevision,
      },
    },
  };

  await publishNoteCreated(ctx, newNotePayload);

  return newNotePayload;
};
