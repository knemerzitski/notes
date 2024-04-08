import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import revisionRecordsPagination, {
  AfterRange,
  AfterRangeUnion,
  BeforeRange,
  CollaborativeDocumentRevisionRecordsPaginationInput,
  unionPaginationBeforeAfterRevisions,
} from './revisionRecordsPagination';
import { UserDocument } from '../models/user';
import { UserNoteDocument } from '../models/user-note';
import { faker } from '@faker-js/faker';
import {
  createUserWithNotes,
  populateWithCreatedData,
} from '../../test/helpers/mongoose/populate';
import {
  CollabText,
  Note,
  User,
  UserNote,
  resetDatabase,
} from '../../tests/helpers/mongoose';
import relayPaginateUserNotesArray, {
  RelayPaginateUserNotesArrayOuput,
} from './relayPaginateUserNotesArray';

import util from 'util';

describe('collaborativeDocumentRevisionRecordsPagination', () => {
  enum TextFields {
    CONTENT = 'content',
  }

  let user: UserDocument;
  let userNotes: UserNoteDocument[];

  beforeAll(async () => {
    await resetDatabase();
    faker.seed(677876);

    const { user: tmpUser, userNotes: tmpUserNotes } = createUserWithNotes(
      1,
      Object.values(TextFields),
      {
        collabDoc: {
          recordsCount: 20,
          tailRevision: -1,
        },
        noteMany: {
          enumaratePublicIdByIndex: 0,
        },
      }
    );
    user = tmpUser;
    userNotes = tmpUserNotes;

    await populateWithCreatedData();
  });

  it.skip('sandbox', async () => {
    const recordsPagination = revisionRecordsPagination({
      paginations: [
        {
          before: 5,
          last: 10,
        },
      ],
    });

    const operations = relayPaginateUserNotesArray({
      pagination: {
        arrayFieldPath: 'order',
      },
      userNotes: {
        noteTextFields: Object.values(TextFields),
        collectionNames: {
          userNote: UserNote.collection.collectionName,
          note: Note.collection.collectionName,
          collaborativeDocument: CollabText.collection.collectionName,
        },
        collaborativeDocumentPipeline: [
          {
            $project: recordsPagination,
          },
        ],
      },
    });

    const results = await User.aggregate<RelayPaginateUserNotesArrayOuput<TextFields>>([
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

    // console.log(util.inspect(operations, false, null, true));
    console.log(util.inspect(results, false, null, true));
  });
});

describe('AfterRangeUnion', () => {
  let union: AfterRangeUnion;

  beforeEach(() => {
    union = new AfterRangeUnion();
  });

  describe('add', () => {
    it.each<[(AfterRange | BeforeRange)[], AfterRange[]]>([
      [[{ after: 3, first: 2 }], [{ after: 3, first: 2 }]],
      [[{ before: 7, last: 2 }], [{ after: 4, first: 2 }]],
      [
        [
          { after: 6, first: 3 },
          { after: 3, first: 2 },
        ],
        [
          { after: 3, first: 2 },
          { after: 6, first: 3 },
        ],
      ],
      [
        [
          { after: 3, first: 2 },
          { after: 6, first: 3 },
        ],
        [
          { after: 3, first: 2 },
          { after: 6, first: 3 },
        ],
      ],
      [
        [
          { after: 2, first: 2 },
          { after: 1, first: 7 },
        ],
        [{ after: 1, first: 7 }],
      ],
      [
        [
          { after: 1, first: 7 },
          { after: 2, first: 2 },
        ],
        [{ after: 1, first: 7 }],
      ],
      [
        [
          { after: 5, first: 4 },
          { after: 2, first: 4 },
        ],
        [{ after: 2, first: 7 }],
      ],
      [
        [
          { after: 5, first: 6 },
          { after: 2, first: 5 },
        ],
        [{ after: 2, first: 9 }],
      ],
    ])('%s => %s', (input, expected) => {
      input.forEach((item) => {
        union.add(item);
      });

      expect(union.slices).toStrictEqual(expected);
    });
  });

  describe('remove', () => {
    it.each<
      [
        (AfterRange | BeforeRange)[],
        Parameters<AfterRangeUnion['remove']>[0],
        number,
        AfterRange[],
      ]
    >([
      [[{ after: 2, first: 3 }], { after: 1 }, 1, []],
      [[{ after: 5, first: 6 }], { after: 6 }, 5, []],
      [
        [
          { after: 2, first: 2 },
          { after: 5, first: 6 },
        ],
        { after: 6 },
        5,
        [{ after: 2, first: 2 }],
      ],
      [[{ before: 10, last: 3 }], { before: 11 }, 11, []],
      [[{ before: 10, last: 3 }], { before: 8 }, 10, []],
      [
        [
          { before: 10, last: 3 },
          { before: 18, last: 2 },
        ],
        { before: 14 },
        14,
        [{ after: 15, first: 2 }],
      ],
      [
        [
          { before: 10, last: 3 },
          { before: 18, last: 2 },
        ],
        { before: 8 },
        10,
        [{ after: 15, first: 2 }],
      ],
    ])('%s => %s', (addItems, input, output, expected) => {
      addItems.forEach((item) => {
        union.add(item);
      });

      expect(union.remove(input)).toStrictEqual(output);
      expect(union.slices).toStrictEqual(expected);
    });
  });
});

describe('unionPaginationBeforeAfterRevisions', () => {
  it.each<
    [
      Pick<
        CollaborativeDocumentRevisionRecordsPaginationInput,
        'paginations' | 'defaultLimit' | 'maxLimit'
      >,
      CollaborativeDocumentRevisionRecordsPaginationInput['paginations'],
    ]
  >([
    [
      {
        paginations: [
          {
            after: 2,
            first: 4,
          },
        ],
      },
      [{ after: 2, first: 4 }],
    ],
    [
      {
        paginations: [
          {
            after: 10,
            first: 5,
          },
          {
            before: 20,
          },
        ],
      },
      [{ before: 20 }],
    ],
    [
      {
        paginations: [
          {
            after: 2,
            first: 4,
          },
          {
            after: 10,
          },
          {
            before: 60,
          },
        ],
      },
      [],
    ],
    [
      {
        paginations: [
          {
            last: 10,
            first: 15,
          },
          {
            last: 13,
            first: 6,
          },
        ],
      },
      [
        {
          first: 15,
        },
        {
          last: 13,
        },
      ],
    ],
    [
      {
        paginations: [
          {
            after: 10,
            first: 5,
          },
          {
            after: 20,
            first: 5,
          },
          {
            before: 50,
            last: 5,
          },
          {
            before: 60,
            last: 5,
          },
          {
            last: 20,
            first: 20,
          },
        ],
      },
      [
        {
          first: 20,
        },
        {
          last: 20,
        },
        {
          after: 10,
          first: 5,
        },
        {
          after: 20,
          first: 5,
        },
        {
          after: 44,
          first: 5,
        },
        {
          after: 54,
          first: 5,
        },
      ],
    ],
  ])('%s => %s', (input, expected) => {
    expect(unionPaginationBeforeAfterRevisions(input)).toStrictEqual(expected);
  });
});
