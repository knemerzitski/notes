import { GraphQLError } from 'graphql/index.js';

import { Changeset } from '../../../../../../collab2/src';

import { QueryableCollabRecord } from '../../../../mongodb/loaders/note/descriptions/collab-record';
import { applyLimit } from '../../../../mongodb/pagination/cursor-array-pagination';
import { CursorBoundPagination } from '../../../../mongodb/pagination/cursor-struct';
import { createMapQueryFn, createValueQueryFn } from '../../../../mongodb/query/query';
import { RevisionChangesetSchema } from '../../../../mongodb/schema/collab-text';
import { PreFetchedArrayGetItemFn } from '../../../utils/pre-execute';
import type { CollabTextResolvers } from '../../types.generated';
import { CollabTextRecordMapper } from '../schema.mappers';

export const CollabText: CollabTextResolvers = {
  headText: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<RevisionChangesetSchema>()(
        (query) => ({ headText: query }),
        (result) => result.headText
      ),
    };
  },
  headRecord: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<RevisionChangesetSchema>()(
        (query) => ({ headText: query }),
        (result) => result.headText
      ),
    };
  },
  tailText: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<RevisionChangesetSchema>()(
        (query) => ({ tailText: query }),
        (result) => result.tailText
      ),
    };
  },
  tailRecord: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<RevisionChangesetSchema>()(
        (query) => ({ tailText: query }),
        (result) => result.tailText
      ),
    };
  },
  textAtRevision: (parent, { revision: targetRevision }) => {
    return {
      query: createValueQueryFn<RevisionChangesetSchema>(
        async ({ revision, changeset }) => {
          if (!revision && !changeset) return {};

          if (!changeset) {
            return {
              revision: targetRevision,
            };
          }

          if (targetRevision <= 0) {
            return {
              revision: 0,
              changeset: Changeset.EMPTY,
            };
          }

          const collabText = await parent.query({
            tailText: {
              revision: 1,
              changeset: 1,
            },
            records: {
              $pagination: {
                before: targetRevision + 1,
              },
              revision: 1,
              changeset: 1,
            },
          });
          if (!collabText) return null;

          const lastRecord = collabText.records[collabText.records.length - 1];
          if (!lastRecord) {
            if (collabText.tailText.revision !== targetRevision) {
              throw new GraphQLError(`Invalid revision ${targetRevision}`);
            }
            return collabText.tailText;
          }

          if (lastRecord.revision !== targetRevision) {
            throw new GraphQLError(`Invalid revision ${targetRevision}`);
          }

          return {
            revision: targetRevision,
            changeset: collabText.records.reduce(
              (a, b) => Changeset.compose(a, b.changeset),
              collabText.tailText.changeset
            ),
          };
        }
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
        headText: {
          revision: 1,
        },
        tailText: {
          revision: 1,
        },
      });
      if (!collabText) return;

      return {
        tailRevision: collabText.tailText.revision,
        headRevision: collabText.headText.revision,
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
