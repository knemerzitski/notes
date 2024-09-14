import { Changeset } from '~collab/changeset/changeset';
import type { CollabTextResolvers } from '../../types.generated';
import {
  applyLimit,
  RelayBoundPagination,
} from '../../../../mongodb/pagination/relay-array-pagination';
import { CollabTextRecordMapper } from '../schema.mappers';
import { PreFetchedArrayGetItemFn } from '../../../utils/pre-execute';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { RevisionChangesetSchema } from '../../../../mongodb/schema/collab-text';
import { StructQuery } from '../../../../mongodb/query/struct-query';
import { QueryableRevisionRecord } from '../../../../mongodb/loaders/note/descriptions/revision-record';

export const CollabText: CollabTextResolvers = {
  headText: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<typeof RevisionChangesetSchema>()(
        (query) => ({ headText: query }),
        (result) => result.headText
      ),
    };
  },
  tailText: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<typeof RevisionChangesetSchema>()(
        (query) => ({ tailText: query }),
        (result) => result.tailText
      ),
    };
  },
  textAtRevision: (parent, { revision: targetRevision }) => {
    return {
      query: StructQuery.get(RevisionChangesetSchema).createQueryFnFromValidated(
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

          const collabText = await parent.query(
            {
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
            },
            'validated'
          );
          if (!collabText) return null;

          const lastRecord = collabText.records[collabText.records.length - 1];
          if (!lastRecord) {
            if (collabText.tailText.revision !== targetRevision) {
              return null;
            }
            return collabText.tailText;
          }

          if (lastRecord.revision !== targetRevision) {
            return null;
          }

          return {
            revision: targetRevision,
            changeset: collabText.records.reduce(
              (a, b) => a.compose(b.changeset),
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

    let pagination: RelayBoundPagination<number>;
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
      query: createMapQueryFn(parent.query)<typeof QueryableRevisionRecord>()(
        (query) => ({
          records: {
            $pagination: pagination,
            ...query,
          },
        }),
        (collabText) => {
          updateSize?.(collabText.records?.length);
          return collabText.records?.[index];
        }
      ),
    });

    async function getHeadAndTailRevision() {
      const collabText = await parent.query(
        {
          headText: {
            revision: 1,
          },
          tailText: {
            revision: 1,
          },
        },
        'validated'
      );
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
};
