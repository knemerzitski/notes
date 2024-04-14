/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { it, describe, beforeEach, beforeAll } from 'vitest';
import {
  User,
  resetDatabase,
  connection,
  Note,
  UserNote,
  CollabText,
} from '../../test/helpers/mongoose';

import util from 'util';
import mapObject, { mapObjectPromise } from '~utils/mapObject';
import { createInitialDocument } from '~collab/adapters/mongodb/collaborative-document';
import { NoteTextField } from '../types.generated';
import {
  CollabTextDocument,
} from '../../mongoose/models/collab/collab-text';
import { UserDocument } from '../../mongoose/models/user';
import { NoteDocument } from '../../mongoose/models/note';
import { lookupNotes } from './_OLD_datasource';

function createUser() {
  return new User({
    profile: {
      displayName: 'test user',
    },
  });
}

function createUserNote(user: UserDocument, note: NoteDocument) {
  return new UserNote({
    userId: user._id,
    note: {
      id: note._id,
      publicId: note.publicId,
      textFields: note.textFields,
      preferences: {
        backgroundColor: 'yellow',
      },
    },
  });
}

function createNote(
  user: UserDocument,
  textFields: Record<NoteTextField, CollabTextDocument>
) {
  return new Note({
    ownerId: user._id,
    textFields: mapObject(textFields, ({ _id }) => ({
      collabId: _id,
    })),
    custom: 'hi',
  });
}

function createCollaborativeDocument(user: UserDocument, text: string) {
  return new CollabText(createInitialDocument(user._id, text));
}

async function createSampleData() {
  const user = createUser();

  const notes = [...new Array<undefined>(2)].map(() => {
    // TODO should map values
    const collabDocs = mapObject(NoteTextField, (field) =>
      createCollaborativeDocument(user, `hello ${field}`)
    );
    const note = createNote(user, collabDocs);
    const userNote = createUserNote(user, note);

    return [note, userNote, ...Object.values(collabDocs).map((d) => d)];
  });

  user.notes.category.default.order = notes.map((stuff) => stuff[1]!._id);

  await Promise.all([user.save(), ...notes.flatMap((s) => s.map((p) => p.save()))]);

  return user;
}

describe.skip('UserNotesDataSource', () => {
  let user: UserDocument;

  beforeAll(async () => {
    await resetDatabase();
    user = await createSampleData();
  });

  it('sandbox', async () => {
    console.log(
      util.inspect(
        await User.aggregate([
          {
            $match: {
              _id: user._id,
            },
          },
          {
            $project: {
              order: '$notes.category.default.order',
            },
          },
          // TODO relay pagination too?
          ...lookupNotes({
            userNoteArrayFieldPath: 'order',
            textFieldNames: Object.values(NoteTextField),
            userNoteCollectionName: UserNote.collection.collectionName,
            noteCollectionName: Note.collection.collectionName,
            collabDocumentCollectionName: CollabText.collection.collectionName,
          })
        ]),
        false,
        null,
        true
      )
    );
  });
});

enum Fields {
  TITLE = 'TITLE',
  CONTENT = 'CONTENT',
}

describe.skip('CollaborativeDocumentDataSource', () => {
  const parentCollection = connection.collection('lookupParent');
  const childCollection = connection.collection('lookupChild');

  beforeEach(async () => {
    await parentCollection.deleteMany();
    await childCollection.deleteMany();
  });

  it('getDocumentAtRevision', async () => {
    const childInserted = await mapObjectPromise(
      Fields,
      async (field) =>
        await childCollection.insertOne({
          info: 'child',
          field,
        })
    );

    await parentCollection.insertOne({
      info: 'parent',
      fields: mapObject(childInserted, ({ insertedId }) => insertedId),
    });

    console.log(
      util.inspect(
        await parentCollection
          .aggregate([
            ...Object.values(Fields).flatMap((fieldName) => [
              {
                $lookup: {
                  from: childCollection.collectionName,
                  foreignField: '_id',
                  localField: `fields.${fieldName}`,
                  as: `fields.${fieldName}`,
                },
              },
              {
                $set: {
                  [`fields.${fieldName}`]: {
                    $arrayElemAt: [`$fields.${fieldName}`, 0],
                  },
                },
              },
            ]),
          ])
          .toArray(),
        false,
        null,
        true
      )
    );
  });
});
