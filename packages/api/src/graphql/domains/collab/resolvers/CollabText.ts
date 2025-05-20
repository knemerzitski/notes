import { QueryableCollabRecord } from '../../../../mongodb/loaders/note/descriptions/collab-record';
import { applyLimit } from '../../../../mongodb/pagination/cursor-array-pagination';
import { CursorBoundPagination } from '../../../../mongodb/pagination/cursor-struct';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { TextRecordSchema } from '../../../../mongodb/schema/collab-text';
import { PreFetchedArrayGetItemFn } from '../../../utils/pre-execute';
import type { CollabTextResolvers } from '../../types.generated';
import { CollabTextRecordMapper } from '../schema.mappers';

export const CollabText: CollabTextResolvers = {
  headRecord: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<TextRecordSchema>()(
        (query) => ({ headRecord: query }),
        (result) => result.headRecord
      ),
    };
  },
  tailRecord: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<TextRecordSchema>()(
        (query) => ({ tailRecord: query }),
        (result) => result.tailRecord
      ),
    };
  },
  recordConnection: (parent, args) => {
    const defaultLimit = 20;
    const maxLimit = 100;
    const first = applyLimit(args.first, defaultLimit, maxLimit);
    const last = applyLimit(args.last, defaultLimit, maxLimit);
    const after = args.after ?? undefined;
    const before = args.before ?? undefined;

    const isForwardPagination = args.after != null || args.first != null;

    let pagination: CursorBoundPagination<number>;
    if (isForwardPagination) {
      pagination = {
        ...(after && { after }),
        first,
      };
    } else {
      pagination = {
        ...(before && { before }),
        last,
      };
    }

    const getRecord: PreFetchedArrayGetItemFn<CollabTextRecordMapper> = (
      index: number,
      updateSize
    ) => ({
      parentId: parent.id,
      query: createMapQueryFn(parent.query)<QueryableCollabRecord>()(
        (query) => ({
          records: {
            $pagination: pagination,
            ...query,
          },
        }),
        (collabText) => {
          updateSize?.(collabText.records.length);
          return collabText.records[index];
        }
      ),
    });

    async function getHeadAndTailRevision() {
      const collabText = await parent.query({
        headRecord: {
          revision: 1,
        },
        tailRecord: {
          revision: 1,
        },
      });
      if (!collabText) return;

      return {
        tailRevision: collabText.tailRecord.revision,
        headRevision: collabText.headRecord.revision,
      };
    }

    return {
      pagination,
      getRecord,
      getHeadAndTailRevision,
    };
  },
  updatedAt: async (parent, _arg, _ctx) => {
    return (
      await parent.query({
        updatedAt: 1,
      })
    )?.updatedAt;
  },
};
