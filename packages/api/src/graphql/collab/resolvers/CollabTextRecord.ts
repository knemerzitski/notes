import { objectIdToStr } from '../../base/resolvers/ObjectID';
import { maybeFn } from '../../utils/maybe-fn';
import { CollabTextSelectionRangeQueryMapper } from '../mongo-query-mapper/selection-range';
import type { CollabTextRecordResolvers } from './../../types.generated';

export const CollabTextRecord: CollabTextRecordResolvers = {
  id: async (parent) => {
    const [parentId, record] = await Promise.all([
      maybeFn(parent.parentId),
      parent.query({
        revision: 1,
      }),
    ]);
    if (parentId == null || record?.revision == null) {
      return null;
    }

    return `${parentId}:${record.revision}`;
  },
  afterSelection: (parent) => {
    return new CollabTextSelectionRangeQueryMapper({
      query: async (selection) => {
        return (
          await parent.query({
            afterSelection: selection,
          })
        )?.afterSelection;
      },
    });
  },
  beforeSelection: (parent) => {
    return new CollabTextSelectionRangeQueryMapper({
      query: async (selection) => {
        return (
          await parent.query({
            beforeSelection: selection,
          })
        )?.beforeSelection;
      },
    });
  },
  change: (parent) => {
    return {
      query: (query) => parent.query(query),
    };
  },
  creatorUserId: async (parent) => {
    return objectIdToStr((await parent.query({ creatorUserId: 1 }))?.creatorUserId);
  },
};
