/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';

import { Changeset } from '~collab/changeset';

import { maybeCallFn } from '~utils/maybe-call-fn';

import { mockResolver } from '../../../../__tests__/helpers/graphql/mock-resolver';
import { STRUCT_NUMBER } from '../../../../mongodb/constants';
import { QueryableCollabRecord } from '../../../../mongodb/loaders/note/descriptions/collab-record';
import {
  CursorAfterPagination,
  CursorBoundPagination,
  CursorFirstPagination,
  CursorLastPagination,
} from '../../../../mongodb/pagination/cursor-struct';
import {
  createValueQueryFn,
  PartialQueryResultDeep,
} from '../../../../mongodb/query/query';
import {
  CollabTextRecordConnectionMapper,
  CollabTextRecordMapper,
} from '../schema.mappers';

import { CollabTextRecordConnection } from './CollabTextRecordConnection';

describe('pageInfo', () => {
  function createMapper(
    pagination: CursorBoundPagination<number>
  ): CollabTextRecordConnectionMapper {
    const tailRevision = 12;
    const recordCount = 8;
    const headRevision = tailRevision + recordCount;
    const allRecords: PartialQueryResultDeep<QueryableCollabRecord>[] = [
      ...new Array<undefined>(recordCount),
    ].map((_, i) => ({
      changeset: Changeset.parseValue([[0, 3 + i], 'a']),
      revision: i + tailRevision + 1,
    }));

    function cursorToIndex(cursor: string | number | ObjectId) {
      if (cursor instanceof ObjectId) {
        throw new Error('impossible');
      }
      return (
        (typeof cursor === 'string' ? Number.parseInt(cursor) : cursor) - tailRevision - 1
      );
    }

    let paginationRecords: PartialQueryResultDeep<QueryableCollabRecord>[];
    if (CursorFirstPagination.is(pagination)) {
      paginationRecords = allRecords.slice(0, pagination.first);
    } else if (CursorLastPagination.is(pagination)) {
      paginationRecords = allRecords.slice(-pagination.last);
    } else if (CursorAfterPagination(STRUCT_NUMBER).is(pagination)) {
      const start = cursorToIndex(pagination.after) + 1;
      const end = start + pagination.first;
      paginationRecords = allRecords.slice(start, end);
    } else {
      const end = cursorToIndex(pagination.before);
      const start = end - pagination.last;
      paginationRecords = allRecords.slice(start, end);
    }

    return {
      pagination,
      getRecord(index): CollabTextRecordMapper {
        return {
          parentId: 'any',
          query: createValueQueryFn<QueryableCollabRecord>(
            () => paginationRecords[index]
          ),
        };
      },
      getHeadAndTailRevision() {
        return {
          headRevision,
          tailRevision,
        };
      },
    };
  }

  const resolvePageInfo = mockResolver(CollabTextRecordConnection.pageInfo!);

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
      const pageInfo = await maybeCallFn(await resolvePageInfo(createMapper(pagination)));
      const hasNextPage = await maybeCallFn(await pageInfo?.hasNextPage);
      expect(hasNextPage).toStrictEqual(expected);
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
      const pageInfo = await maybeCallFn(await resolvePageInfo(createMapper(pagination)));
      const hasPreviousPage = await maybeCallFn(await pageInfo?.hasPreviousPage);
      expect(hasPreviousPage).toStrictEqual(expected);
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
      const pageInfo = await maybeCallFn(await resolvePageInfo(createMapper(pagination)));
      const startCursor = await maybeCallFn(await pageInfo?.startCursor);
      expect(startCursor).toStrictEqual(expected);
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
      const pageInfo = await maybeCallFn(await resolvePageInfo(createMapper(pagination)));
      const endCursor = await maybeCallFn(await pageInfo?.endCursor);
      expect(endCursor).toStrictEqual(expected);
    });
  });
});
