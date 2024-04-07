/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeAll, expect, it } from 'vitest';
import {
  populateWithCreatedData,
  createUserWithNotes,
} from '../../test/helpers/mongoose/populate';
import {
  CollaborativeDocument,
  Note,
  User,
  UserNote,
  resetDatabase,
} from '../../tests/helpers/mongoose';
import { UserDocument } from '../models/user';
import userNotesArray, { UserNotesArrayOutput } from './userNotesArray';
import projectCollaborativeDocument, {
  ProjectCollaborativeDocumentOutput,
} from './_projectCollaborativeDocument';
import { ObjectId } from 'mongodb';

enum TextFields {
  TITLE = 'title',
  CONTENT = 'content',
}

let user: UserDocument;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(3256);

  const { user: tmpUser } = createUserWithNotes(2, Object.values(TextFields), {
    collabDoc: {
      recordsCount: 1,
    },
  });
  user = tmpUser;

  await populateWithCreatedData();
});

// TODO test
it.skip('returns userNote data in expected format', async () => {
  const result = await User.aggregate<
    UserNotesArrayOutput<TextFields, ProjectCollaborativeDocumentOutput>
  >([
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
    ...userNotesArray({
      fieldPath: 'order',
      noteTextFields: Object.values(TextFields),
      collectionNames: {
        userNote: UserNote.collection.collectionName,
        note: Note.collection.collectionName,
        collaborativeDocument: CollaborativeDocument.collection.collectionName,
      },
      lookupNote: true,
      collaborativeDocumentPipeline: [
        {
          $project: projectCollaborativeDocument({
            headDocument: true,
          }),
        },
      ],
    }),
  ]);

  const userNote = result[0]?.userNotes[0];
  assert(userNote != null);

  expect(userNote).toMatchObject({
    _id: expect.any(ObjectId),
    note: {
      id: expect.any(ObjectId),
      publicId: expect.any(String),
      textFields: {
        title: {
          _id: expect.any(ObjectId),
          headDocument: {
            changeset: expect.any(Array),
            revision: expect.any(Number),
          },
        },
        content: {
          _id: expect.any(ObjectId),
          headDocument: {
            changeset: expect.any(Array),
            revision: expect.any(Number),
          },
        },
      },
      lookupNote: {
        ownerId: expect.any(ObjectId),
      },
    },
    preferences: {
      backgroundColor: expect.any(String),
    },
    readOnly: expect.any(Boolean),
  });
});
