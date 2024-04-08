import { assert, beforeAll, expect, it } from 'vitest';
import {
  CollabText,
  Note,
  UserNote,
  resetDatabase,
} from '../../../tests/helpers/mongoose';
import { faker } from '@faker-js/faker';
import { UserNoteDocument } from '../../models/user-note';
import {
  createUserWithNotes,
  populateWithCreatedData,
} from '../../../test/helpers/mongoose/populate';
import userNoteLookup, {
  UserNoteLookupOnlyCollabTextOutput,
  UserNoteLookupOnlyNoteOutput,
  UserNoteLookupOutput,
} from './userNoteLookup';
import { ObjectId } from 'mongodb';

enum CollabTextKey {
  TITLE = 'title',
  CONTENT = 'content',
}

let userNote: UserNoteDocument;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(88877);

  const { userNotes: tmpUserNotes } = createUserWithNotes(
    1,
    Object.values(CollabTextKey),
    {
      collabDoc: {
        recordsCount: 1,
      },
    }
  );
  assert(tmpUserNotes[0] != null);
  userNote = tmpUserNotes[0];

  await populateWithCreatedData();
});

export const expectedCollabText = {
  _id: expect.any(ObjectId),
  headDocument: {
    changeset: expect.any(Array),
    revision: expect.any(Number),
  },
  tailDocument: {
    changeset: expect.any(Array),
    revision: expect.any(Number),
  },
  records: expect.any(Array),
};

it('returns userNote in expected format', async () => {
  const results = await UserNote.aggregate<UserNoteLookupOutput<CollabTextKey>>([
    {
      $match: {
        _id: userNote._id,
      },
    },
    ...userNoteLookup({
      note: {
        collectionName: Note.collection.collectionName,
      },
      collabText: {
        collectionName: CollabText.collection.collectionName,
        keys: Object.values(CollabTextKey),
      },
    }),
  ]);

  const result = results[0];
  assert(result != null);

  expect(result).toMatchObject({
    _id: expect.any(ObjectId),
    note: {
      id: expect.any(ObjectId),
      publicId: expect.any(String),
      ownerId: expect.any(ObjectId),
      collabText: {
        title: expectedCollabText,
        content: expectedCollabText,
      },
    },
    preferences: {
      backgroundColor: expect.any(String),
    },
    readOnly: expect.any(Boolean),
  });
});

it('only looks up collabTextId', async () => {
  const results = await UserNote.aggregate<
    UserNoteLookupOnlyCollabTextOutput<CollabTextKey>
  >([
    {
      $match: {
        _id: userNote._id,
      },
    },
    ...userNoteLookup({
      collabText: {
        collectionName: CollabText.collection.collectionName,
        keys: Object.values(CollabTextKey),
      },
    }),
  ]);

  const result = results[0];
  assert(result != null);

  expect((result.note as { ownerId?: unknown }).ownerId).toBeUndefined();
});

it('only looks up note', async () => {
  const results = await UserNote.aggregate<UserNoteLookupOnlyNoteOutput<CollabTextKey>>([
    {
      $match: {
        _id: userNote._id,
      },
    },
    ...userNoteLookup({
      note: {
        collectionName: Note.collection.collectionName,
      },
    }),
  ]);

  const result = results[0];
  assert(result != null);

  expect((result.note as { collabText?: unknown }).collabText).toBeUndefined();
});

it('uses note pipeline', async () => {
  interface CustomNote {
    customOwnerId: ObjectId;
    custom: string;
  }

  const results = await UserNote.aggregate<UserNoteLookupOnlyNoteOutput<CustomNote>>([
    {
      $match: {
        _id: userNote._id,
      },
    },
    ...userNoteLookup({
      note: {
        collectionName: Note.collection.collectionName,
        pipeline: [
          {
            $project: {
              customOwnerId: '$ownerId',
              custom: 'hi',
            },
          },
        ],
      },
    }),
  ]);

  const result = results[0];
  assert(result != null);

  expect(result).toMatchObject({
    note: {
      customOwnerId: expect.any(ObjectId),
      custom: expect.any(String),
    },
  });
});

it('uses collabText pipeline separate for each key', async () => {
  interface CustomCollabText {
    custom: string;
  }

  const results = await UserNote.aggregate<
    UserNoteLookupOnlyCollabTextOutput<CollabTextKey, CustomCollabText>
  >([
    {
      $match: {
        _id: userNote._id,
      },
    },
    ...userNoteLookup({
      note: {
        collectionName: Note.collection.collectionName,
      },
      collabText: {
        collectionName: CollabText.collection.collectionName,
        keys: Object.fromEntries(
          Object.values(CollabTextKey).map((collabKey) => [
            collabKey,
            {
              pipeline: [
                {
                  $project: {
                    custom: `hi ${collabKey}`,
                  },
                },
              ],
            },
          ])
        ),
      },
    }),
  ]);

  const result = results[0];
  assert(result != null);

  result.note.collabText?.content.custom;

  expect(result).toMatchObject({
    note: {
      collabText: {
        title: { custom: expect.stringMatching('hi title') },
        content: { custom: expect.stringMatching('hi content') },
      },
    },
  });
});
