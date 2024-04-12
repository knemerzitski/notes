/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { assert, beforeAll, expect, it } from 'vitest';
import {
  CollabText,
  Note,
  User,
  UserNote,
  resetDatabase,
} from '../../../tests/helpers/mongoose';
import { faker } from '@faker-js/faker';
import {
  createUserWithNotes,
  populateWithCreatedData,
} from '../../../test/helpers/mongoose/populate';
import { UserNoteLookupOutput } from './userNoteLookup';
import { ObjectId } from 'mongodb';
import userNotesArrayLookup, { UserNotesArrayLookupOutput } from './userNotesArrayLookup';
import { UserDocument } from '../../models/user';

import { expectedCollabText } from './userNoteLookup.int.test';

enum CollabTextKey {
  CONTENT = 'content',
}

let user: UserDocument;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(9243);

  const { user: tmpUser } = createUserWithNotes(2, Object.values(CollabTextKey), {
    collabDoc: {
      recordsCount: 1,
    },
  });
  user = tmpUser;

  await populateWithCreatedData();
});

it('returns userNotesArray in expected format', async () => {
  const results = await User.aggregate<UserNotesArrayLookupOutput<CollabTextKey>>([
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
    ...userNotesArrayLookup({
      fieldPath: 'order',
      userNoteCollctionName: UserNote.collection.collectionName,
      userNoteLookupInput: {
        note: {
          collectionName: Note.collection.collectionName,
        },
        collabText: {
          collectionName: CollabText.collection.collectionName,
          collabText: Object.values(CollabTextKey),
        },
      },
    }),
  ]);

  const result = results[0];
  assert(result != null);

  result.userNotes.forEach((userNote) => {
    expect(userNote).toMatchObject({
      _id: expect.any(ObjectId),
      note: {
        id: expect.any(ObjectId),
        publicId: expect.any(String),
        ownerId: expect.any(ObjectId),
        collabText: {
          content: expectedCollabText,
        },
      },
      preferences: {
        backgroundColor: expect.any(String),
      },
      readOnly: expect.any(Boolean),
    });
  });
});

it('uses groupExpression', async () => {
  const results = await User.aggregate<
    UserNotesArrayLookupOutput<
      CollabTextKey,
      UserNoteLookupOutput<CollabTextKey>,
      { firstElement: ObjectId }
    >
  >([
    {
      $match: {
        _id: user._id,
      },
    },
    {
      $project: {
        order: '$notes.category.default.order',
        firstElement: {
          $first: '$notes.category.default.order',
        },
      },
    },
    ...userNotesArrayLookup({
      fieldPath: 'order',
      userNoteCollctionName: UserNote.collection.collectionName,
      userNoteLookupInput: {
        note: {
          collectionName: Note.collection.collectionName,
        },
      },
      groupExpression: {
        firstElement: {
          $first: `$firstElement`,
        },
      },
    }),
  ]);

  const result = results[0];
  assert(result != null);

  expect(result.firstElement).toEqual(expect.any(ObjectId));
});
