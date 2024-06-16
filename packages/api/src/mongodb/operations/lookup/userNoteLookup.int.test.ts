/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { assert, beforeAll, expect, it } from 'vitest';

import { mongoCollections, resetDatabase } from '../../../test/helpers/mongodb';
import {
  populateUserWithNotes,
  populateWithCreatedData,
} from '../../../test/helpers/mongodb/populate';
import { CollectionName } from '../../collections';
import { CollabTextSchema } from '../../schema/collab-text';
import { NoteSchema } from '../../schema/note';
import { ShareNoteLinkSchema } from '../../schema/share-note-link';
import { UserNoteSchema } from '../../schema/user-note';

import userNoteLookup, { UserNoteLookupOutput } from './userNoteLookup';


enum CollabTextKey {
  TITLE = 'title',
  CONTENT = 'content',
}

let userNote: UserNoteSchema;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(88877);

  const { userNotes: tmpUserNotes } = populateUserWithNotes(
    1,
    Object.values(CollabTextKey),
    {
      collabText: {
        recordsCount: 1,
      },
    }
  );
  assert(tmpUserNotes[0] != null);
  userNote = tmpUserNotes[0];

  await populateWithCreatedData();
});

const expectedCollabText = {
  _id: expect.any(ObjectId),
  headText: {
    changeset: expect.any(Array),
    revision: expect.any(Number),
  },
  tailText: {
    changeset: expect.any(Array),
    revision: expect.any(Number),
  },
  records: expect.any(Array),
};

it('returns userNote in expected format', async () => {
  const results = await mongoCollections[CollectionName.UserNotes]
    .aggregate<
      UserNoteLookupOutput<CollabTextKey, CollabTextSchema, UserNoteSchema, NoteSchema>
    >([
      {
        $match: {
          _id: userNote._id,
        },
      },
      ...userNoteLookup({
        note: {
          collectionName: mongoCollections[CollectionName.Notes].collectionName,
        },
        collabText: {
          collectionName: mongoCollections[CollectionName.CollabTexts].collectionName,
          collabTexts: Object.values(CollabTextKey),
        },
      }),
    ])
    .toArray();

  const result = results[0];
  assert(result != null);

  expect(result).toMatchObject({
    _id: expect.any(ObjectId),
    note: {
      id: expect.any(ObjectId),
      publicId: expect.any(String),
      ownerId: expect.any(ObjectId),
      collabTexts: {
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

it('only looks up collabTextIds', async () => {
  const results = await mongoCollections[CollectionName.UserNotes]
    .aggregate<
      UserNoteLookupOutput<CollabTextKey, CollabTextSchema, UserNoteSchema, undefined>
    >([
      {
        $match: {
          _id: userNote._id,
        },
      },
      ...userNoteLookup({
        collabText: {
          collectionName: mongoCollections[CollectionName.CollabTexts].collectionName,
          collabTexts: Object.values(CollabTextKey),
        },
      }),
    ])
    .toArray();

  const result = results[0];
  assert(result != null);

  expect((result.note as { ownerId?: unknown }).ownerId).toBeUndefined();
});

it('only looks up note', async () => {
  const results = await mongoCollections[CollectionName.UserNotes]
    .aggregate<
      UserNoteLookupOutput<CollabTextKey, undefined, UserNoteSchema, NoteSchema>
    >([
      {
        $match: {
          _id: userNote._id,
        },
      },
      ...userNoteLookup({
        note: {
          collectionName: mongoCollections[CollectionName.Notes].collectionName,
        },
      }),
    ])
    .toArray();

  const result = results[0];
  assert(result != null);

  expect((result.note as { collabTexts?: unknown }).collabTexts).toBeUndefined();
});

it('uses note pipeline', async () => {
  interface CustomNote {
    customOwnerId: ObjectId;
    custom: string;
  }
  const results = await mongoCollections[CollectionName.UserNotes]
    .aggregate<
      UserNoteLookupOutput<CollabTextKey, undefined, { note?: undefined }, CustomNote>
    >([
      {
        $match: {
          _id: userNote._id,
        },
      },
      ...userNoteLookup({
        note: {
          collectionName: mongoCollections[CollectionName.Notes].collectionName,
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
    ])
    .toArray();

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

  const results = await mongoCollections[CollectionName.UserNotes]
    .aggregate<
      UserNoteLookupOutput<
        CollabTextKey,
        CustomCollabText,
        { note?: undefined },
        undefined
      >
    >([
      {
        $match: {
          _id: userNote._id,
        },
      },
      ...userNoteLookup({
        note: {
          collectionName: mongoCollections[CollectionName.Notes].collectionName,
        },
        collabText: {
          collectionName: mongoCollections[CollectionName.CollabTexts].collectionName,
          collabTexts: Object.fromEntries(
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
    ])
    .toArray();

  const result = results[0];
  assert(result != null);

  expect(result).toMatchObject({
    note: {
      collabTexts: {
        title: { custom: expect.stringMatching('hi title') },
        content: { custom: expect.stringMatching('hi content') },
      },
    },
  });
});

it('looks up shareNoteLinks', async () => {
  const results = await mongoCollections[CollectionName.UserNotes]
    .aggregate<
      UserNoteLookupOutput<
        CollabTextKey,
        undefined,
        UserNoteSchema,
        NoteSchema,
        ShareNoteLinkSchema
      >
    >([
      {
        $match: {
          _id: userNote._id,
        },
      },
      ...userNoteLookup({
        shareNoteLink: {
          collectionName: mongoCollections[CollectionName.ShareNoteLinks].collectionName,
        },
      }),
    ])
    .toArray();

  const result = results[0];
  assert(result != null);

  expect(result.shareNoteLinks[0]).toStrictEqual({
    _id: expect.any(ObjectId),
    publicId: expect.any(String),
    permissions: expect.any(Object),
    expireAt: expect.any(Date),
    expireAccessCount: expect.any(Number),
  });
});
