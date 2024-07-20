/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { assert, beforeAll, expect, it } from 'vitest';

import { NoteCategory, NoteTextField } from '../../../graphql/types.generated';
import { mongoCollections, resetDatabase } from '../../../test/helpers/mongodb';
import { populateNotes } from '../../../test/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../test/helpers/mongodb/populate/populate-queue';
import { CollectionName } from '../../collections';
import { CollabTextSchema } from '../../schema/collab-text';
import { NoteSchema } from '../../schema/note';
import { getNotesArrayPath, UserSchema } from '../../schema/user';
import { UserNoteSchema } from '../../schema/user-note';

import { UserNoteLookupOutput } from './userNoteLookup';
import userNotesArrayLookup, { UserNotesArrayLookupOutput } from './userNotesArrayLookup';

let user: UserSchema;

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

beforeAll(async () => {
  await resetDatabase();
  faker.seed(9243);

  const populateResult = populateNotes(2);
  user = populateResult.user;

  await populateExecuteAll();
});

it('returns userNotesArray in expected format', async () => {
  const results = await mongoCollections[CollectionName.USERS]
    .aggregate<
      UserNotesArrayLookupOutput<
        UserNoteLookupOutput<
          NoteTextField,
          CollabTextSchema,
          UserNoteSchema,
          NoteSchema
        >[]
      >
    >([
      {
        $match: {
          _id: user._id,
        },
      },
      {
        $project: {
          order: `$${getNotesArrayPath(NoteCategory.DEFAULT)}`,
        },
      },
      ...userNotesArrayLookup({
        fieldPath: 'order',
        userNoteCollctionName: mongoCollections[CollectionName.USER_NOTES].collectionName,
        userNoteLookupInput: {
          note: {
            collectionName: mongoCollections[CollectionName.NOTES].collectionName,
          },
          collabText: {
            collectionName: mongoCollections[CollectionName.COLLAB_TEXTS].collectionName,
            collabTexts: Object.values(NoteTextField),
          },
        },
      }),
    ])
    .toArray();

  const result = results[0];
  assert(result != null);

  result.userNotes.forEach((userNote) => {
    expect(userNote).toMatchObject({
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
});

it('uses groupExpression', async () => {
  const results = await mongoCollections[CollectionName.USERS]
    .aggregate<
      UserNotesArrayLookupOutput<
        UserNoteLookupOutput<
          NoteTextField,
          CollabTextSchema,
          UserNoteSchema,
          NoteSchema
        >[],
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
          order: `$${getNotesArrayPath(NoteCategory.DEFAULT)}`,
          firstElement: {
            $first: `$${getNotesArrayPath(NoteCategory.DEFAULT)}`,
          },
        },
      },
      ...userNotesArrayLookup({
        fieldPath: 'order',
        userNoteCollctionName: mongoCollections[CollectionName.USER_NOTES].collectionName,
        userNoteLookupInput: {
          note: {
            collectionName: mongoCollections[CollectionName.NOTES].collectionName,
          },
        },
        groupExpression: {
          firstElement: {
            $first: `$firstElement`,
          },
        },
      }),
    ])
    .toArray();

  const result = results[0];
  assert(result != null);

  expect(result.firstElement).toEqual(expect.any(ObjectId));
});
