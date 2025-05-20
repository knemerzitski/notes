import { maybeCallFn } from '../../../../../../utils/src/maybe-call-fn';

import { createMapQueryFn } from '../../../../mongodb/query/query';
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
