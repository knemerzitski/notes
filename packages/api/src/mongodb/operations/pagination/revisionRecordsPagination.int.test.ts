/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import mapObject from 'map-obj';
import { ObjectId } from 'mongodb';
import { assert, beforeAll, expect, it } from 'vitest';

import { NoteCategory } from '../../../graphql/types.generated';
import { mongoCollections, resetDatabase } from '../../../test/helpers/mongodb';
import {
  populateUserWithNotes,
  populateWithCreatedData,
} from '../../../test/helpers/mongodb/populate';
import { CollectionName } from '../../collections';
import { CollabTextSchema } from '../../schema/collab-text';
import { NoteSchema } from '../../schema/note';
import { getNotesArrayPath, UserSchema } from '../../schema/user';
import { UserNoteSchema } from '../../schema/user-note';
import { UserNoteLookupOutput } from '../lookup/userNoteLookup';

import relayPaginateUserNotesArray, {
  RelayPaginateUserNotesArrayOuput,
} from './relayPaginateUserNotesArray';
import revisionRecordsPagination, {
  CollabTextRevisionRecordsPaginationInput,
  CollabTextRevisionRecordsPaginationOutput,
} from './revisionRecordsPagination';

enum CollabTextKey {
  CONTENT = 'content',
}

let user: UserSchema;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(88765);

  const { user: tmpUser } = populateUserWithNotes(1, Object.values(CollabTextKey), {
    collabText: {
      recordsCount: 10,
      tailRevision: 0,
    },
    noteMany: {
      enumaratePublicIdByIndex: 0,
    },
  });
  user = tmpUser;

  await populateWithCreatedData();
});

it('gets records within usernotes pagination', async () => {
  const paginationInput: CollabTextRevisionRecordsPaginationInput = {
    paginations: [
      {
        after: 2,
        first: 2,
      },
    ],
  };

  const recordsPagination = revisionRecordsPagination(paginationInput);

  const results = await mongoCollections[CollectionName.Users]
    .aggregate<
      RelayPaginateUserNotesArrayOuput<
        CollabTextKey,
        UserNoteLookupOutput<
          CollabTextKey,
          Omit<CollabTextSchema, 'records'> & {
            records: CollabTextRevisionRecordsPaginationOutput;
          },
          UserNoteSchema,
          NoteSchema
        >
      >
    >([
      {
        $match: {
          _id: user._id,
        },
      },
      ...relayPaginateUserNotesArray({
        pagination: {
          [getNotesArrayPath(NoteCategory.DEFAULT)]: {},
        },
        userNotes: {
          userNoteCollctionName:
            mongoCollections[CollectionName.UserNotes].collectionName,
          userNoteLookupInput: {
            note: {
              collectionName: mongoCollections[CollectionName.Notes].collectionName,
            },
            collabText: {
              collectionName: mongoCollections[CollectionName.CollabTexts].collectionName,

              collabTexts: mapObject(CollabTextKey, (_key, field) => [
                field,
                {
                  pipeline: [
                    {
                      $set: {
                        records: recordsPagination,
                      },
                    },
                    {
                      $project: {
                        headText: 1,
                        tailText: 1,
                        records: {
                          array: {
                            revision: 1,
                            afterSelection: 1,
                            beforeSelection: 1,
                            changeset: 1,
                            userGeneratedId: 1,
                            creatorUserId: 1,
                          },
                          sizes: 1,
                        },
                      },
                    },
                  ],
                },
              ]),
            },
          },
        },
      }),
    ])
    .toArray();

  const result = results[0];
  assert(result != null);

  expect(result).toMatchObject({
    userNotes: {
      multiSizes: [1],
      array: [
        {
          _id: expect.any(ObjectId),
          readOnly: expect.any(Boolean),
          preferences: { backgroundColor: expect.any(String) },
          note: {
            id: expect.any(ObjectId),
            publicId: expect.any(String),
            collabTexts: {
              content: {
                _id: expect.any(ObjectId),
                headText: { changeset: ['head'], revision: 10 },
                tailText: { changeset: [], revision: 0 },
                records: {
                  array: [
                    {
                      creatorUserId: expect.any(ObjectId),
                      userGeneratedId: expect.any(String),
                      revision: 3,
                      changeset: ['r_3'],
                      beforeSelection: { start: 0 },
                      afterSelection: { start: 0 },
                    },
                    {
                      creatorUserId: expect.any(ObjectId),
                      userGeneratedId: expect.any(String),
                      revision: 4,
                      changeset: ['r_4'],
                      beforeSelection: { start: 0 },
                      afterSelection: { start: 0 },
                    },
                  ],
                  sizes: [0, 0, 2],
                },
              },
            },
            ownerId: expect.any(ObjectId),
          },
        },
      ],
    },
  });
});
