import { beforeAll, describe, expect, it } from 'vitest';
import { CollabTextQueryMapper } from './collab-text';
import { mock } from 'vitest-mock-extended';
import { ObjectId } from 'mongodb';
import { DeepQueryResponse } from '../../../mongodb/query-builder';
import { CollabTextRecordQuery } from './revision-record';
import {
  isAfterPagination,
  isFirstPagination,
  isLastPagination,
} from '../../../mongodb/operations/pagination/relayArrayPagination';

let collabTextMapper: CollabTextQueryMapper;

beforeAll(() => {
  collabTextMapper = new CollabTextQueryMapper({
    queryDocument(query) {
      const tailRevision = 12;
      const recordCount = 8;
      const headRevision = tailRevision + recordCount;
      const allRecords: DeepQueryResponse<CollabTextRecordQuery>[] = [
        ...new Array<undefined>(recordCount),
      ].map((_, i) => ({
        revision: i + tailRevision + 1,
      }));

      function cursorToIndex(cursor: string | number) {
        return (
          (typeof cursor === 'string' ? Number.parseInt(cursor) : cursor) -
          tailRevision -
          1
        );
      }

      let paginationRecords: DeepQueryResponse<CollabTextRecordQuery>[];
      const pagination = query.records?.$pagination;
      if (pagination) {
        if (isFirstPagination(pagination)) {
          paginationRecords = allRecords.slice(0, pagination.first);
        } else if (isLastPagination(pagination)) {
          paginationRecords = allRecords.slice(-pagination.last);
        } else if (isAfterPagination(pagination)) {
          const start = cursorToIndex(pagination.after) + 1;
          const end =
            pagination.first != null ? start + pagination.first : allRecords.length;
          paginationRecords = allRecords.slice(start, end);
        } else {
          const end = cursorToIndex(pagination.before);
          const start = pagination.last != null ? end - pagination.last : 0;
          paginationRecords = allRecords.slice(start, end);
        }
      } else {
        paginationRecords = [];
      }

      return Promise.resolve({
        _id: mock<ObjectId>(),
        tailText: {
          changeset: ['tail'],
          revision: tailRevision,
        },
        headText: {
          changeset: ['head'],
          revision: headRevision,
        },
        records: paginationRecords,
      });
    },
  });
});

describe('hasNextPage', () => {
  it.each([
    {
      pagination: {
        first: 2,
      },
      expected: true,
    },
    {
      pagination: {
        first: 7,
      },
      expected: true,
    },
    {
      pagination: {
        first: 8,
      },
      expected: false,
    },
    {
      pagination: {
        after: 18,
        first: 1,
      },
      expected: true,
    },
    {
      pagination: {
        after: 18,
        first: 2,
      },
      expected: false,
    },
    {
      pagination: {
        last: 2,
      },
      expected: false,
    },
    {
      pagination: {
        before: 20,
        last: 1,
      },
      expected: true,
    },
    {
      pagination: {
        before: 19,
        last: 1,
      },
      expected: true,
    },
    {
      pagination: {
        before: 30,
        last: 1,
      },
      expected: false,
    },
  ])('$pagination => $expected', async ({ pagination, expected }) => {
    await expect(
      collabTextMapper
        .recordsConnection(pagination, {
          maxLimit: 20,
        })
        .pageInfo()
        .hasNextPage()
    ).resolves.toStrictEqual(expected);
  });
});

describe('hasPreviousPage', () => {
  it.each([
    {
      pagination: {
        first: 2,
      },
      expected: false,
    },
    {
      pagination: {
        last: 2,
      },
      expected: true,
    },
    {
      pagination: {
        last: 7,
      },
      expected: true,
    },
    {
      pagination: {
        last: 8,
      },
      expected: false,
    },
    {
      pagination: {
        after: 13,
        first: 1,
      },
      expected: true,
    },
    {
      pagination: {
        after: 5,
        first: 1,
      },
      expected: false,
    },
    {
      pagination: {
        before: 15,
        last: 1,
      },
      expected: true,
    },
    {
      pagination: {
        before: 15,
        last: 2,
      },
      expected: false,
    },
  ])('$pagination => $expected', async ({ pagination, expected }) => {
    await expect(
      collabTextMapper
        .recordsConnection(pagination, {
          maxLimit: 20,
        })
        .pageInfo()
        .hasPreviousPage()
    ).resolves.toStrictEqual(expected);
  });
});

// records [13,14,15,16,17,18,19,20]
describe('startCursor', () => {
  it.each([
    {
      pagination: {
        first: 2,
      },
      expected: 13,
    },
    {
      pagination: {
        after: 15,
        first: 2,
      },
      expected: 16,
    },
    {
      pagination: {
        last: 3,
      },
      expected: 18,
    },
    {
      pagination: {
        before: 18,
        last: 2,
      },
      expected: 16,
    },
    {
      pagination: {
        before: 15,
        last: 6,
      },
      expected: 13,
    },
  ])('$pagination => $expected', async ({ pagination, expected }) => {
    await expect(
      collabTextMapper
        .recordsConnection(pagination, {
          maxLimit: 20,
        })
        .pageInfo()
        .startCursor()
    ).resolves.toStrictEqual(expected);
  });
});

// records 12,[13,14,15,16,17,18,19,20]
describe('endCursor', () => {
  it.each([
    {
      pagination: {
        first: 2,
      },
      expected: 14,
    },
    {
      pagination: {
        after: 15,
        first: 2,
      },
      expected: 17,
    },
    {
      pagination: {
        last: 3,
      },
      expected: 20,
    },
    {
      pagination: {
        before: 18,
        last: 2,
      },
      expected: 17,
    },
    {
      pagination: {
        after: 18,
        last: 7,
      },
      expected: 20,
    },
  ])('$pagination => $expected', async ({ pagination, expected }) => {
    await expect(
      collabTextMapper
        .recordsConnection(pagination, {
          maxLimit: 20,
        })
        .pageInfo()
        .endCursor()
    ).resolves.toStrictEqual(expected);
  });
});
