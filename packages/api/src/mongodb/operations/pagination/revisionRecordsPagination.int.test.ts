/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import mapObject from 'map-obj';
import { ObjectId } from 'mongodb';
import { assert, beforeAll, expect, it } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import {
  mongoCollections,
  resetDatabase,
} from '../../../__test__/helpers/mongodb/mongodb';
import { populateNotes } from '../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../__test__/helpers/mongodb/populate/populate-queue';
import { NoteCategory, NoteTextField } from '../../../graphql/types.generated';
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

let user: UserSchema;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(88765);

  const populateResult = populateNotes(1, {
    collabText() {
      return {
        recordsCount: 10,
        initialText: 'head',
        record(_recordIndex, revision) {
          return {
            changeset: Changeset.fromInsertion(`r_${revision}`).serialize(),
          };
        },
      };
    },
  });
  user = populateResult.user;

  await populateExecuteAll();
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

  const results = await mongoCollections[CollectionName.USERS]
    .aggregate<
      RelayPaginateUserNotesArrayOuput<
        NoteTextField,
        UserNoteLookupOutput<
          NoteTextField,
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
            mongoCollections[CollectionName.USER_NOTES].collectionName,
          userNoteLookupInput: {
            note: {
              collectionName: mongoCollections[CollectionName.NOTES].collectionName,
            },
            collabText: {
              collectionName:
                mongoCollections[CollectionName.COLLAB_TEXTS].collectionName,

              collabTexts: mapObject(NoteTextField, (_key, field) => [
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
              [NoteTextField.CONTENT]: {
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
                      afterSelection: { start: 4 },
                    },
                    {
                      creatorUserId: expect.any(ObjectId),
                      userGeneratedId: expect.any(String),
                      revision: 4,
                      changeset: ['r_4'],
                      beforeSelection: { start: 0 },
                      afterSelection: { start: 4 },
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
