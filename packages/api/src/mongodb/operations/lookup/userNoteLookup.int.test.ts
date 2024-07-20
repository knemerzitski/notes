/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { assert, beforeAll, expect, it } from 'vitest';

import { NoteTextField } from '../../../graphql/types.generated';
import { mongoCollections, resetDatabase } from '../../../test/helpers/mongodb';
import { populateNotes } from '../../../test/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../test/helpers/mongodb/populate/populate-queue';
import { CollectionName } from '../../collections';
import { CollabTextSchema } from '../../schema/collab-text';
import { NoteSchema } from '../../schema/note';
import { ShareNoteLinkSchema } from '../../schema/share-note-link';
import { UserNoteSchema } from '../../schema/user-note';

import userNoteLookup, { UserNoteLookupOutput } from './userNoteLookup';

let userNote: UserNoteSchema;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(88877);

  const populateResult = populateNotes(1);
  assert(populateResult.data[0] != null);
  userNote = populateResult.data[0].userNote;

  await populateExecuteAll();
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
  const results = await mongoCollections[CollectionName.USER_NOTES]
    .aggregate<
      UserNoteLookupOutput<NoteTextField, CollabTextSchema, UserNoteSchema, NoteSchema>
    >([
      {
        $match: {
          _id: userNote._id,
        },
      },
      ...userNoteLookup({
        note: {
          collectionName: mongoCollections[CollectionName.NOTES].collectionName,
        },
        collabText: {
          collectionName: mongoCollections[CollectionName.COLLAB_TEXTS].collectionName,
          collabTexts: Object.values(NoteTextField),
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
        [NoteTextField.TITLE]: expectedCollabText,
        [NoteTextField.CONTENT]: expectedCollabText,
      },
    },
    preferences: {
      backgroundColor: expect.any(String),
    },
    readOnly: expect.any(Boolean),
  });
});

it('only looks up collabTextIds', async () => {
  const results = await mongoCollections[CollectionName.USER_NOTES]
    .aggregate<
      UserNoteLookupOutput<NoteTextField, CollabTextSchema, UserNoteSchema, undefined>
    >([
      {
        $match: {
          _id: userNote._id,
        },
      },
      ...userNoteLookup({
        collabText: {
          collectionName: mongoCollections[CollectionName.COLLAB_TEXTS].collectionName,
          collabTexts: Object.values(NoteTextField),
        },
      }),
    ])
    .toArray();

  const result = results[0];
  assert(result != null);

  expect((result.note as { ownerId?: unknown }).ownerId).toBeUndefined();
});

it('only looks up note', async () => {
  const results = await mongoCollections[CollectionName.USER_NOTES]
    .aggregate<
      UserNoteLookupOutput<NoteTextField, undefined, UserNoteSchema, NoteSchema>
    >([
      {
        $match: {
          _id: userNote._id,
        },
      },
      ...userNoteLookup({
        note: {
          collectionName: mongoCollections[CollectionName.NOTES].collectionName,
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
  const results = await mongoCollections[CollectionName.USER_NOTES]
    .aggregate<
      UserNoteLookupOutput<NoteTextField, undefined, { note?: undefined }, CustomNote>
    >([
      {
        $match: {
          _id: userNote._id,
        },
      },
      ...userNoteLookup({
        note: {
          collectionName: mongoCollections[CollectionName.NOTES].collectionName,
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

  const results = await mongoCollections[CollectionName.USER_NOTES]
    .aggregate<
      UserNoteLookupOutput<
        NoteTextField,
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
          collectionName: mongoCollections[CollectionName.NOTES].collectionName,
        },
        collabText: {
          collectionName: mongoCollections[CollectionName.COLLAB_TEXTS].collectionName,
          collabTexts: Object.fromEntries(
            Object.values(NoteTextField).map((collabKey) => [
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
        [NoteTextField.TITLE]: { custom: expect.stringMatching('hi TITLE') },
        [NoteTextField.CONTENT]: { custom: expect.stringMatching('hi CONTENT') },
      },
    },
  });
});

it('looks up shareNoteLinks', async () => {
  const results = await mongoCollections[CollectionName.USER_NOTES]
    .aggregate<
      UserNoteLookupOutput<
        NoteTextField,
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
          collectionName:
            mongoCollections[CollectionName.SHARE_NOTE_LINKS].collectionName,
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
