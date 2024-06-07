import { FieldFunctionOptions, FieldPolicy } from '@apollo/client';
import {
  CollabText,
  CollabTextRecord,
  CollabTextRecordConnection,
} from '../../../../__generated__/graphql';
import mergeOrderedSet from '~utils/ordered-set/mergeOrderedSet';
import { binarySearchIndexOf } from '~utils/array/binarySearchIndexOf';
import { binarySearchConsecutiveOrderedSubset } from '~utils/ordered-set/consecutive-ordered-set';

interface CollabTextRecordOnlyRevision {
  change: {
    revision: CollabTextRecord['change']['revision'];
  };
}

function compareRecords(
  a: CollabTextRecordOnlyRevision,
  b: CollabTextRecordOnlyRevision
) {
  return a.change.revision - b.change.revision;
}

function rankRecord(a: CollabTextRecordOnlyRevision) {
  return a.change.revision;
}

export const recordsConnection: FieldPolicy<
  CollabText['recordsConnection'],
  CollabText['recordsConnection']
> = {
  read(existing, { args }) {
    if (!existing) return;

    if (args?.after != null) {
      const after = Number(args.after);
      if (Number.isNaN(after)) {
        return;
      }

      // Start of records
      const records = existing.records;
      const { index: start, exists } = binarySearchIndexOf<CollabTextRecordOnlyRevision>(
        records,
        { change: { revision: after + 1 } },
        compareRecords
      );
      if (!exists) {
        return;
      }

      let end: number;
      if (args.first != null) {
        // End from first
        const first = Number(args.first);
        if (Number.isNaN(first)) {
          return;
        }
        end = start + first;
        if (records[end - 1]?.change.revision !== after + first) {
          return;
        }
      } else {
        // All after
        const consecutiveRange = binarySearchConsecutiveOrderedSubset(
          records,
          rankRecord,
          'end',
          start
        );
        end = consecutiveRange.end;
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      // const endRecord = records[end - 1]!;

      return {
        ...existing,
        records: records.slice(start, end),
        // pageInfo: {
        //   hasPreviousPage: start > 1,
        //   hasNextPage: end < records.length,
        //   startCursor: after + 1,
        //   endCursor: endRecord.change.revision,
        // },
      };
    }

    // before last
    if (args?.before != null) {
      const before = Number(args.before);
      if (Number.isNaN(before)) {
        return;
      }

      // Start of records
      const records = existing.records;
      const { index: endIndex, exists } =
        binarySearchIndexOf<CollabTextRecordOnlyRevision>(
          records,
          { change: { revision: before - 1 } },
          compareRecords
        );
      if (!exists) {
        return;
      }
      const end = endIndex + 1;

      let start: number;
      if (args.last != null) {
        // Start from last
        const last = Number(args.last);
        if (Number.isNaN(last)) {
          return;
        }

        start = end - last;
        if (records[start]?.change.revision !== before - last) {
          return;
        }
      } else {
        // All before
        const consecutiveRange = binarySearchConsecutiveOrderedSubset(
          records,
          rankRecord,
          'start',
          0,
          end
        );
        start = consecutiveRange.start;
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      // const startRecord = records[start]!;

      return {
        ...existing,
        records: records.slice(start, end),
        // pageInfo: {
        //   hasPreviousPage: start > 1,
        //   hasNextPage: end < records.length,
        //   startCursor: startRecord.change.revision,
        //   endCursor: before - 1,
        // },
      };
    }

    // No args, return what's available in cache
    if (
      args?.after == null &&
      args?.first == null &&
      args?.before == null &&
      args?.ast !== null
    ) {
      return existing;
    }

    return;
  },
  merge(existing, incoming, options) {
    if (!existing) return incoming;

    return {
      ...incoming,
      records: mergeRecords(existing.records, incoming.records, options),
      pageInfo: mergePageInfo(
        existing.pageInfo,
        incoming.pageInfo
      ) as CollabText['recordsConnection']['pageInfo'],
    };
  },
};

/**
 * Keep records unique and ordered.
 */
function mergeRecords(
  existing: CollabTextRecordConnection['records'] | undefined,
  incoming: CollabTextRecordConnection['records'],
  { mergeObjects }: FieldFunctionOptions
) {
  if (!existing) return incoming;

  const existingRecords = [...existing];
  const incomingRecords = incoming;

  mergeOrderedSet(existingRecords, incomingRecords, compareRecords, mergeObjects);

  return existingRecords;
}

/**
 * Once hasPreviousInfo is false, it can never be true again.
 * Records are only created forward in time.
 */
function mergePageInfo(
  existing: Partial<CollabTextRecordConnection['pageInfo']> | undefined,
  incoming: Partial<CollabTextRecordConnection['pageInfo']> | undefined
) {
  if (!incoming) return existing;
  if (!existing) return incoming;

  const hasPreviousPage =
    incoming.hasPreviousPage === false ? false : existing.hasPreviousPage;

  return {
    ...incoming,
    ...(hasPreviousPage != null && { hasPreviousPage }),
  };
}
