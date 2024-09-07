import { maybeCallFn } from '~utils/maybe-call-fn';

import type { CollabTextRecordResolvers } from '../../types.generated';
import { createMapQueryFn, MongoQueryFnStruct } from '../../../../mongodb/query/query';
import {
  RevisionChangesetSchema,
  SelectionRangeSchema,
} from '../../../../mongodb/schema/collab-text';
import { PublicUserMapper } from '../../user/schema.mappers';

type PublicUser = MongoQueryFnStruct<PublicUserMapper['query']>;

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
      query: createMapQueryFn(parent.query)<typeof SelectionRangeSchema>()(
        (query) => ({ afterSelection: query }),
        (result) => result.afterSelection
      ),
    };
  },
  beforeSelection: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<typeof SelectionRangeSchema>()(
        (query) => ({ beforeSelection: query }),
        (result) => result.beforeSelection
      ),
    };
  },
  change: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<typeof RevisionChangesetSchema>()(
        (query) => query,
        (result) => result
      ),
    };
  },
  creatorUser: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<PublicUser>()(
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
