import { objectIdToStr } from '../../base/resolvers/ObjectID';
import { maybeFn } from '../../utils/maybe-fn';

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
    return {
      query: async (query) => {
        return (
          await parent.query({
            afterSelection: query,
          })
        )?.afterSelection;
      },
    };
  },
  beforeSelection: (parent) => {
    return {
      query: async (query) => {
        return (
          await parent.query({
            beforeSelection: query,
          })
        )?.beforeSelection;
      },
    };
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
