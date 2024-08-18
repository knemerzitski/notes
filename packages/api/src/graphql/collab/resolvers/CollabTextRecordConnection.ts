import { maybeCallFn } from '~utils/maybe-call-fn';
import { isForwardPagination } from '../../../mongodb/pagination/relay-array-pagination';
import { withPreFetchedArraySize } from '../../utils/with-pre-fetched-array-size';
import type { CollabTextRecordConnectionResolvers } from './../../types.generated';

export const CollabTextRecordConnection: CollabTextRecordConnectionResolvers = {
  records: (parent, _args, ctx, info) => {
    return withPreFetchedArraySize(parent.getRecord, ctx, info);
  },
  edges: (parent, _args, ctx, info) => {
    return withPreFetchedArraySize(
      (index, updateSize) => {
        const recordMapper = parent.getRecord(index, updateSize);

        return {
          node: recordMapper,
          cursor: async () => {
            return (
              await recordMapper.query({
                revision: 1,
              })
            )?.revision;
          },
        };
      },
      ctx,
      info
    );
  },
  pageInfo: (parent) => {
    const pagination = parent.pagination;

    return {
      hasNextPage: async () => {
        const collabText = await maybeCallFn(parent.getHeadAndTailRevision());
        if (!collabText) {
          return false;
        }
        const { tailRevision, headRevision } = collabText;

        if (isForwardPagination(pagination)) {
          return (pagination.after ?? tailRevision) + pagination.first < headRevision;
        }

        if (pagination.before != null) {
          return pagination.before <= headRevision;
        }

        return false;
      },
      hasPreviousPage: async () => {
        const collabText = await maybeCallFn(parent.getHeadAndTailRevision());
        if (!collabText) {
          return false;
        }
        const { tailRevision, headRevision } = collabText;

        if (isForwardPagination(pagination)) {
          if (pagination.after != null) {
            return tailRevision < pagination.after;
          }

          return false;
        }

        return (
          tailRevision + 1 < (pagination.before ?? headRevision + 1) - pagination.last
        );
      },
      startCursor: async () => {
        const collabText = await maybeCallFn(parent.getHeadAndTailRevision());
        if (!collabText) {
          return null;
        }
        const { tailRevision, headRevision } = collabText;

        if (isForwardPagination(pagination)) {
          if (pagination.after != null) {
            return Math.max(tailRevision + 1, pagination.after + 1);
          }

          return tailRevision + 1;
        }

        if (pagination.before != null) {
          return Math.max(tailRevision + 1, pagination.before - pagination.last);
        }

        return Math.max(tailRevision, headRevision - pagination.last) + 1;
      },
      endCursor: async () => {
        const collabText = await maybeCallFn(parent.getHeadAndTailRevision());
        if (!collabText) {
          return null;
        }
        const { tailRevision, headRevision } = collabText;

        if (isForwardPagination(pagination)) {
          if (pagination.after != null) {
            return Math.min(headRevision, pagination.after + pagination.first);
          }

          return Math.min(headRevision, tailRevision + pagination.first);
        }

        if (pagination.before != null) {
          return Math.max(tailRevision + 1, pagination.before - 1);
        }

        return headRevision;
      },
    };
  },
};
