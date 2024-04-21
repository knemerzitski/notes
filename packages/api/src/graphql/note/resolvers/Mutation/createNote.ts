import { assertAuthenticated } from '../../../base/directives/auth';
import { publishNoteCreated } from '../Subscription/noteCreated';

import {
  NoteTextField,
  ResolversTypes,
  type MutationResolvers,
} from '../../../types.generated';

import { Changeset } from '~collab/changeset/changeset';
import mapObject from 'map-obj';
import { ObjectId } from 'mongodb';
import { CollabTextSchema } from '../../../../mongodb/schema/collabText/collab-text';
import { NoteSchema, noteDefaultValues } from '../../../../mongodb/schema/note';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { CollectionName } from '../../../../mongodb/collections';
import { NoteQuery, NoteQueryMapper } from '../../mongo-query-mapper/note';
import { DeepQueryResponse } from '../../../../mongodb/query-builder';

export const createNote: NonNullable<MutationResolvers['createNote']> = async (
  _parent,
  { input },
  ctx
) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  // Initialize data
  const collabTexts = mapObject(NoteTextField, (_key, fieldName) => {
    const fieldValue = input.note?.textFields?.find((s) => s.key === fieldName)?.value;
    const text = fieldValue?.initialText ?? '';
    return [
      fieldName,
      createCollabText({
        creatorUserId: currentUserId,
        initalText: text,
      }),
    ];
  });

  const note: NoteSchema = {
    _id: new ObjectId(),
    ownerId: currentUserId,
    publicId: noteDefaultValues.publicId(),
    collabTextIds: mapObject(collabTexts, (key, collabText) => [key, collabText._id]),
  };

  const userNote: UserNoteSchema = {
    _id: new ObjectId(),
    userId: currentUserId,
    note: {
      id: note._id,
      collabTextIds: note.collabTextIds,
      publicId: note.publicId,
    },
    preferences: {
      backgroundColor: input.note?.preferences?.backgroundColor ?? undefined,
    },
  };

  // Insert to DB
  await mongodb.client.withSession((session) =>
    session.withTransaction(async (session) => {
      // TODO handle duplicate _id and note.publicId
      const updateUserPromise = mongodb.collections[CollectionName.Users].updateOne(
        {
          _id: currentUserId,
        },
        {
          $push: {
            'notes.category.default.order': userNote._id,
          },
        },
        { session }
      );

      await Promise.all([
        ...Object.values(collabTexts).map((collabText) =>
          mongodb.collections[CollectionName.CollabTexts].insertOne(collabText, {
            session,
          })
        ),
        mongodb.collections[CollectionName.Notes].insertOne(note, { session }),
        mongodb.collections[CollectionName.UserNotes].insertOne(userNote, { session }),
        updateUserPromise,
      ]);
    })
  );

  // Build response mapper
  const noteQueryResponse: DeepQueryResponse<NoteQuery> = {
    ...userNote,
    note: {
      ...note,
      ...userNote.note,
      collabTexts,
    },
  };
  const noteQueryMapper = new NoteQueryMapper({
    queryDocument() {
      return noteQueryResponse;
    },
  });

  // Send response
  const payload: ResolversTypes['CreateNotePayload'] &
    ResolversTypes['NoteCreatedPayload'] = {
    note: noteQueryMapper,
  };

  await publishNoteCreated(ctx, payload);

  return payload;
};

interface CreateCollabTextParams {
  initalText: string;
  creatorUserId: ObjectId;
}

function createCollabText({
  initalText,
  creatorUserId,
}: CreateCollabTextParams): CollabTextSchema {
  const changeset = Changeset.fromInsertion(initalText).serialize();
  return {
    _id: new ObjectId(),
    headText: {
      revision: 0,
      changeset,
    },
    tailText: {
      revision: -1,
      changeset: Changeset.EMPTY.serialize(),
    },
    records: [
      {
        creatorUserId,
        userGeneratedId: '',
        revision: 0,
        changeset,
        beforeSelection: {
          start: 0,
        },
        afterSelection: {
          start: initalText.length,
        },
      },
    ],
  };
}
