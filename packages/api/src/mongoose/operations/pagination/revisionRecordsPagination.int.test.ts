/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { assert, beforeAll, describe, expect, it } from 'vitest';
import revisionRecordsPagination, {
  CollabTextRevisionRecordsPaginationInput,
  CollabTextRevisionRecordsPaginationOutput,
} from './revisionRecordsPagination';
import { UserDocument } from '../../models/user';
import { faker } from '@faker-js/faker';
import {
  createUserWithNotes,
  populateWithCreatedData,
} from '../../../test/helpers/mongoose/populate';
import {
  CollabText,
  Note,
  User,
  UserNote,
  resetDatabase,
} from '../../../tests/helpers/mongoose';
import relayPaginateUserNotesArray, {
  RelayPaginateUserNotesArrayOuput,
} from './relayPaginateUserNotesArray';

import { DefaultCollabTextPipeline, UserNoteLookupOutput } from '../lookup/userNoteLookup';
import { ObjectId } from 'mongodb';

describe('collaborativeDocumentRevisionRecordsPagination', () => {
  enum CollabTextKey {
    CONTENT = 'content',
  }

  let user: UserDocument;

  beforeAll(async () => {
    await resetDatabase();
    faker.seed(88765);

    const { user: tmpUser } = createUserWithNotes(1, Object.values(CollabTextKey), {
      collabDoc: {
        recordsCount: 10,
        tailRevision: -1,
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

    const operations = relayPaginateUserNotesArray({
      pagination: {
        arrayFieldPath: 'order',
      },
      userNotes: {
        userNoteCollctionName: UserNote.collection.collectionName,
        userNoteLookupInput: {
          note: {
            collectionName: Note.collection.collectionName,
          },
          collabText: {
            collectionName: CollabText.collection.collectionName,
            keys: Object.fromEntries(
              Object.values(CollabTextKey).map((field) => [
                field,
                {
                  pipeline: [
                    {
                      $set: {
                        records: recordsPagination,
                      },
                    },
                  ],
                },
              ])
            ),
          },
        },
      },
    });

    const results = await User.aggregate<
      RelayPaginateUserNotesArrayOuput<
        CollabTextKey,
        UserNoteLookupOutput<
          CollabTextKey,
          Omit<DefaultCollabTextPipeline, 'records'> & {
            records: CollabTextRevisionRecordsPaginationOutput;
          }
        >
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
        },
      },
      ...operations,
    ]);

    const result = results[0];
    assert(result != null);

    expect(result).toMatchObject({
      sizes: null,
      userNotes: [
        {
          _id: expect.any(ObjectId),
          readOnly: expect.any(Boolean),
          preferences: { backgroundColor: expect.any(String) },
          note: {
            id: expect.any(ObjectId),
            publicId: expect.any(String),
            collabText: {
              content: {
                _id: expect.any(ObjectId),
                headDocument: { changeset: ['head'], revision: 9 },
                tailDocument: { changeset: [], revision: -1 },
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
    });
  });
});
