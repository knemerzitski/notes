import { createInitialDocument } from '~collab/adapters/mongodb/collaborative-document';

import { assertAuthenticated } from '../../../base/directives/auth';
import { publishNoteCreated } from '../Subscription/noteCreated';

import {
  NoteTextField,
  type CreateNotePayload,
  type MutationResolvers,
  type NoteCreatedPayload,
} from './../../../types.generated';

import { Changeset } from '~collab/changeset/changeset';
import mapObject from 'map-obj';

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

  const collabDocs = mapObject(NoteTextField, (_key, fieldName) => {
    const fieldValue = input.note?.textFields?.find((s) => s.key === fieldName)?.value;

    return [
      fieldName,
      new model.CollaborativeDocument(
        createInitialDocument(currentUserId, fieldValue?.initialText ?? '')
      ),
    ];
  });

  const newNote = new model.Note({
    ownerId: currentUserId,
      textFields: mapObject(collabDocs, (key,_collabDoc) => [key, { collabId: collabDoc._id }]),
  });

  const newUserNote = new model.UserNote({
    userId: currentUserId,
    note: {
      publicId: newNote.publicId,
      textFields: newNote.textFields,
    },
  });

  await connection.transaction(async (session) => {
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
      ...Object.values(collabDocs).map((collabDoc) => collabDoc.save({ session })),
      newNote.save({ session }),
      newUserNote.save({ session }),
      updateUserPromise,
    ]);
  });

  const newNotePayload: CreateNotePayload & NoteCreatedPayload = {
    note: {
      id: newNote.publicId,
      textFields: Object.entries(collabDocs).map(([fieldName, collabDoc]) => ({
        key: fieldName as NoteTextField,
        value: {
          _id: collabDoc._id,
          id: collabDoc._id.toString(),
          headDocument: {
            revision: collabDoc.headDocument.revision,
            changeset: collabDoc.headDocument.changeset,
          },
          recordsConnection: {
            tailDocument: {
              revision: -1,
              changeset: Changeset.EMPTY,
            },
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            edges: collabDoc.records.map((record) => {
              const id = `${collabDoc._id.toString()}:${record.change.revision}`;
              return {
                cursor: id,
                node: {
                  id,
                  creatorUserId: record.creatorUserId.toString(),
                  change: record.change,
                  beforeSelection: record.beforeSelection,
                  afterSelection: record.afterSelection,
                },
              };
            }),
          },
        },
      })),
    },
  };

  await publishNoteCreated(ctx, newNotePayload);

  return newNotePayload;
};
