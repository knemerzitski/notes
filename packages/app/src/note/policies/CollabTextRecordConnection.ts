import { binarySearchIndexOf } from '~utils/array/binary-search';

import { binarySearchConsecutiveOrderedSubset } from '~utils/ordered-set/consecutive-ordered-set';
import { mergeOrderedSet } from '~utils/ordered-set/merge-ordered-set';

import { CollabTextRecord, Maybe, PageInfo } from '../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

interface Edge {
  node: {
    change: {
      revision: CollabTextRecord['change']['revision'];
    };
  };
}

function compareRecords(a: Edge, b: Edge) {
  return a.node.change.revision - b.node.change.revision;
}

function rankRecord(a: Edge) {
  return a.node.change.revision;
}

export const CollabTextRecordConnection: CreateTypePolicyFn = function (
  _ctx: TypePoliciesContext
) {
  return {
    fields: {
      edges: {
        keyArgs: false,
        read(existing: Maybe<Edge[]>, { args, variables }) {
          if (!existing) return;

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const argsAfter = args?.after ?? variables?.after;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const argsLast = args?.last ?? variables?.last;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const argsFirst = args?.first ?? variables?.first;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const argsBefore = args?.before ?? variables?.before;

          if (argsAfter != null) {
            const after = Number(argsAfter);
            if (Number.isNaN(after)) {
              return;
            }

            // Start of records
            const { index: start, exists } = binarySearchIndexOf<Edge>(
              existing,
              { node: { change: { revision: after + 1 } } },
              compareRecords
            );
            if (!exists) {
              return;
            }

            let end: number;
            if (argsFirst != null) {
              // End from first
              const first = Number(argsFirst);
              if (Number.isNaN(first)) {
                return;
              }
              end = start + first;
              if (existing[end - 1]?.node.change.revision !== after + first) {
                return;
              }
            } else {
              // All after
              const consecutiveRange = binarySearchConsecutiveOrderedSubset(
                existing,
                rankRecord,
                'end',
                start
              );
              end = consecutiveRange.end;
            }

            return existing.slice(start, end);
          }

          // before last
          if (argsBefore != null) {
            const before = Number(argsBefore);
            if (Number.isNaN(before)) {
              return;
            }

            // Start of records
            const { index: endIndex, exists } = binarySearchIndexOf<Edge>(
              existing,
              { node: { change: { revision: before - 1 } } },
              compareRecords
            );
            if (!exists) {
              return;
            }
            const end = endIndex + 1;

            let start: number;

            if (argsLast != null) {
              // Start from last
              const last = Number(argsLast);
              if (Number.isNaN(last)) {
                return;
              }

              start = end - last;
              if (existing[start]?.node.change.revision !== before - last) {
                return;
              }
            } else {
              // All before
              const consecutiveRange = binarySearchConsecutiveOrderedSubset(
                existing,
                rankRecord,
                'start',
                0,
                end
              );
              start = consecutiveRange.start;
            }

            return existing.slice(start, end);
          }

          // No args, return what's available in cache
          if (
            argsAfter == null &&
            argsFirst == null &&
            argsBefore == null &&
            argsLast !== null
          ) {
            return existing;
          }

          return;
        },
        merge(existing: Maybe<Edge[]>, incoming: Edge[], { mergeObjects }) {
          if (!existing) return incoming;

          const existingRecords = [...existing];
          const incomingRecords = incoming;

          mergeOrderedSet(existingRecords, incomingRecords, compareRecords, mergeObjects);

          return existingRecords;
        },
      },
      pageInfo: {
        keyArgs: false,
        /**
         * Once hasPreviousInfo is false, it can never be true again.
         * Records are only created forwards.
         */
        merge(existing: Maybe<Partial<PageInfo>>, incoming: Maybe<Partial<PageInfo>>) {
          if (!incoming) return existing;
          if (!existing) return incoming;

          const hasPreviousPage =
            incoming.hasPreviousPage === false ? false : existing.hasPreviousPage;

          return {
            ...existing,
            ...incoming,
            ...(hasPreviousPage != null && { hasPreviousPage }),
          };
        },
      },
    },
  };
};
