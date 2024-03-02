import { ObjectId } from 'mongodb';

import { Changeset } from '~collab/changeset/changeset';

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

  const initialText = input.note?.textContent ?? '';
  // TODO collaborative document module
  const initialChangeset = Changeset.fromInsertion(initialText);

  const newNote = new model.Note({
    ownerId: currentUserId,
    title: input.note?.title,
    content: {
      latestRevision: 0,
      latestText: initialText,
      records: [
        {
          revision: 0,
          changeset: initialChangeset,
        },
      ],
    },
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
      title: newNote.title ?? '',
      content: {
        revision: newNote.content.latestRevision,
        text: newNote.content.latestText,
      },
      preferences: {},
    },
  };

  await publishNoteCreated(ctx, newNotePayload);

  return newNotePayload;
};
