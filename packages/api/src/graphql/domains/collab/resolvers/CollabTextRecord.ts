import { maybeCallFn } from '../../../../../../utils/src/maybe-call-fn';

import { createMapQueryFn } from '../../../../mongodb/query/query';
import { RevisionChangesetSchema } from '../../../../mongodb/schema/changeset';
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
  afterSelection: async (parent) => {
    const selection = (await parent.query({ selection: 1 }))?.selection;
    if (!selection) {
      return null;
    }

    return {
      start: selection.start,
      end: selection.end,
    };
  },
  beforeSelection: async (parent) => {
    const selection = (await parent.query({ selectionInverse: 1 }))?.selectionInverse;
    if (!selection) {
      return null;
    }

    return {
      start: selection.start,
      end: selection.end,
    };
  },
  selectionInverse: async (parent) => {
    return (await parent.query({ selectionInverse: 1 }))?.selectionInverse;
  },
  selection: async (parent) => {
    return (await parent.query({ selection: 1 }))?.selection;
  },
  revision: async (parent) => {
    return (await parent.query({ revision: 1 }))?.revision;
  },
  changeset: async (parent) => {
    return (await parent.query({ changeset: 1 }))?.changeset;
  },
  inverse: async (parent) => {
    return (await parent.query({ inverse: 1 }))?.inverse;
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
            author: {
              _id: 1,
            },
          })
        )?.author._id,
      query: createMapQueryFn(parent.query)<Pick<UserSchema, '_id' | 'profile'>>()(
        (query) => ({ author: query }),
        (result) => result.author
      ),
    };
  },
  author: (parent) => {
    return {
      userId: async () =>
        (
          await parent.query({
            author: {
              _id: 1,
            },
          })
        )?.author._id,
      query: createMapQueryFn(parent.query)<Pick<UserSchema, '_id' | 'profile'>>()(
        (query) => ({ author: query }),
        (result) => result.author
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
