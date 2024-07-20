import mapObject from 'map-obj';
import { ObjectId } from 'mongodb';

import { Changeset } from '~collab/changeset/changeset';

import { CollectionName } from '../../../../mongodb/collections';
import { DeepQueryResponse } from '../../../../mongodb/query-builder';
import {
  CollabTextSchema,
  CollabTextUserNoteSchema,
} from '../../../../mongodb/schema/collab-text';
import { NoteSchema, noteDefaultValues } from '../../../../mongodb/schema/note';
import { getNotesArrayPath } from '../../../../mongodb/schema/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  NoteCategory,
  NoteTextField,
  ResolversTypes,
  type MutationResolvers,
} from '../../../types.generated';
import { NoteQuery, NoteQueryMapper } from '../../mongo-query-mapper/note';
import { publishNoteCreated } from '../Subscription/noteCreated';

export const createNote: NonNullable<MutationResolvers['createNote']> = async (
  _parent,
  { input },
  ctx
) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const userNoteId = new ObjectId();

  const collabTextUserNote: CollabTextUserNoteSchema = {
    id: userNoteId,
    userId: currentUserId,
  };

  // Initialize data
  const collabTexts = mapObject(NoteTextField, (_key, fieldName) => {
    const fieldValue = input.note?.textFields?.find((s) => s.key === fieldName)?.value;
    const text = fieldValue?.initialText ?? '';
    return [
      fieldName,
      createCollabText({
        userNote: collabTextUserNote,
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

  const categoryName = NoteCategory.DEFAULT;
  const notesArrayPath = getNotesArrayPath(categoryName);

  const userNote: UserNoteSchema = {
    _id: userNoteId,
    userId: currentUserId,
    note: {
      id: note._id,
      collabTextIds: note.collabTextIds,
      publicId: note.publicId,
    },
    preferences: {
      backgroundColor: input.note?.preferences?.backgroundColor ?? undefined,
    },
    category: {
      name: categoryName,
    },
  };

  // Insert to DB
  await mongodb.client.withSession((session) =>
    session.withTransaction(async (session) => {
      // TODO handle duplicate _id and note.publicId
      const updateUserPromise = mongodb.collections[CollectionName.USERS].updateOne(
        {
          _id: currentUserId,
        },
        {
          // TODO what if path doesn't exist
          $push: {
            [notesArrayPath]: userNote._id,
          },
        },
        { session }
      );

      await Promise.all([
        ...Object.values(collabTexts).map((collabText) =>
          mongodb.collections[CollectionName.COLLAB_TEXTS].insertOne(collabText, {
            session,
          })
        ),
        mongodb.collections[CollectionName.NOTES].insertOne(note, { session }),
        mongodb.collections[CollectionName.USER_NOTES].insertOne(userNote, { session }),
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
  userNote: CollabTextUserNoteSchema;
  initalText: string;
}

function createCollabText({
  initalText,
  userNote,
}: CreateCollabTextParams): CollabTextSchema {
  const changeset = Changeset.fromInsertion(initalText).serialize();
  return {
    _id: new ObjectId(),
    userNotes: [userNote],
    headText: {
      revision: 1,
      changeset,
    },
    tailText: {
      revision: 0,
      changeset: Changeset.EMPTY.serialize(),
    },
    records: [
      {
        creatorUserId: userNote.userId,
        userGeneratedId: '',
        revision: 1,
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
