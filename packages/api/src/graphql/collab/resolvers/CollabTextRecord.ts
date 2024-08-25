import { maybeCallFn } from '~utils/maybe-call-fn';

import type { CollabTextRecordResolvers } from './../../types.generated';

export const CollabTextRecord: CollabTextRecordResolvers = {
  id: async (parent) => {
    const [parentId, record] = await Promise.all([
      maybeCallFn(parent.parentId),
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
  creatorUser: (parent, _arg, _ctx) => {
    return {
      query: async (query) =>
        (
          await parent.query({
            creatorUser: query,
          })
        )?.creatorUser,
    };
  },
  createdAt: async (parent, _arg, _ctx) => {
    return (
      await parent.query({
        createdAt: 1,
      })
    )?.createdAt;
  },
};
