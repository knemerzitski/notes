import { maybeCallFn } from '~utils/maybe-call-fn';

import { createMapQueryFn } from '../../../../mongodb/query/query';
import {
  RevisionChangesetSchema,
  SelectionRangeSchema,
} from '../../../../mongodb/schema/collab-text';
import { UserSchema } from '../../../../mongodb/schema/user';
import type { CollabTextRecordResolvers } from '../../types.generated';

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
      query: createMapQueryFn(parent.query)<SelectionRangeSchema>()(
        (query) => ({ afterSelection: query }),
        (result) => result.afterSelection
      ),
    };
  },
  beforeSelection: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<SelectionRangeSchema>()(
        (query) => ({ beforeSelection: query }),
        (result) => result.beforeSelection
      ),
    };
  },
  change: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<RevisionChangesetSchema>()(
        (query) => query,
        (result) => result
      ),
    };
  },
  creatorUser: (parent) => {
    return {
      userId: async () =>
        (
          await parent.query({
            creatorUser: {
              _id: 1,
            },
          })
        )?.creatorUser._id,
      query: createMapQueryFn(parent.query)<Pick<UserSchema, '_id' | 'profile'>>()(
        (query) => ({ creatorUser: query }),
        (result) => result.creatorUser
      ),
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
