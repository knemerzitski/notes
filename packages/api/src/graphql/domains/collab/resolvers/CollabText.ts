import { Changeset } from '~collab/changeset/changeset';
import type { CollabTextResolvers } from '../../types.generated';
import {
  applyLimit,
  RelayBoundPagination,
} from '../../../../mongodb/pagination/relay-array-pagination';
import { ObjectQueryDeep } from '../../../../mongodb/query/query';
import { CollabTextRecordMapper } from '../schema.mappers';
import { QueryableRevisionRecord } from '../../../../mongodb/descriptions/revision-record';
import { PreFetchedArrayGetItemFn } from '../../../../services/graphql/pre-execute';

export const CollabText: CollabTextResolvers = {
  headText: (parent) => {
    return {
      query: async (query) =>
        (
          await parent.query({
            headText: query,
          })
        )?.headText,
    };
  },
  tailText: (parent) => {
    return {
      query: async (query) =>
        (
          await parent.query({
            tailText: query,
          })
        )?.tailText,
    };
  },
  textAtRevision: (parent, { revision: targetRevision }) => {
    return {
      query: async ({ revision, changeset }) => {
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
            changeset: 1,
          },
          records: {
            $pagination: {
              before: targetRevision + 1,
            },
            changeset: 1,
          },
        });
        if (collabText?.tailText?.changeset == null || collabText.records == null) {
          return null;
        }

        const recordsChangesets = collabText.records.map((rawRecord) => {
          const serializedChangeset = rawRecord.changeset;
          if (serializedChangeset == null) {
            throw new Error('RevisionRecord.changeset is null');
          }

          return Changeset.parseValue(serializedChangeset);
        });

        return {
          revision: targetRevision,
          changeset: recordsChangesets.reduce(
            (a, b) => a.compose(b),
            Changeset.parseValue(collabText.tailText.changeset)
          ),
        };
      },
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
    ) => {
      const queryRecord = async (query: ObjectQueryDeep<QueryableRevisionRecord>) => {
        const collabText = await parent.query({
          records: {
            $pagination: pagination,
            ...query,
          },
        });
        updateSize(collabText?.records?.length);
        return collabText?.records?.[index];
      };

      return {
        parentId: parent.id,
        query: queryRecord,
      };
    };

    async function getHeadAndTailRevision() {
      const collabText = await parent.query({
        headText: {
          revision: 1,
        },
        tailText: {
          revision: 1,
        },
      });
      if (
        collabText?.headText?.revision == null ||
        collabText.tailText?.revision == null
      ) {
        return;
      }

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
