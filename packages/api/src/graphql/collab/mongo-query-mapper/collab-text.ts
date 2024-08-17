import { GraphQLResolveInfo } from 'graphql';

import { Changeset } from '~collab/changeset/changeset';

import {
  RelayArrayPaginationConfig,
  RelayPagination,
  applyLimit,
} from '../../../mongodb/pagination/relay-array-pagination';
import { DeepObjectQuery, MongoQuery } from '../../../mongodb/query/query';
import { QueryableCollabTextSchema } from '../../../mongodb/schema/collab-text/query/collab-text';
import { ApiGraphQLContext } from '../../context';
import {
  CollabTextrecordsConnectionArgs,
  CollabTexttextAtRevisionArgs,
  Maybe,
} from '../../types.generated';
import {
  PreFetchedArrayGetItemFn,
  withPreFetchedArraySize,
} from '../../utils/with-pre-fetched-array-size';
import {
  CollabTextMapper,
  CollabTextRecordMapper,
  RevisionChangesetMapper,
} from '../schema.mappers';

import { RevisionRecordSchema } from '../../../mongodb/schema/collab-text/collab-text';
import { MaybePromise } from '~utils/types';

export abstract class CollabTextQueryMapper implements CollabTextMapper {
  private collabText: MongoQuery<QueryableCollabTextSchema>;

  constructor(collabText: MongoQuery<QueryableCollabTextSchema>) {
    this.collabText = collabText;
  }

  abstract id(): MaybePromise<Maybe<string>>;

  headText(): RevisionChangesetMapper {
    return {
      query: async (query) =>
        (
          await this.collabText.query({
            headText: query,
          })
        )?.headText,
    };
  }

  tailText(): RevisionChangesetMapper {
    return {
      query: async (query) =>
        (
          await this.collabText.query({
            tailText: query,
          })
        )?.tailText,
    };
  }

  textAtRevision({
    revision: targetRevision,
  }: CollabTexttextAtRevisionArgs): RevisionChangesetMapper {
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

        const collabText = await this.collabText.query({
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
  }

  recordsConnection(
    args: CollabTextrecordsConnectionArgs,
    config: RelayArrayPaginationConfig
  ) {
    const first = applyLimit(args.first, config.defaultLimit, config.maxLimit);
    const last = applyLimit(args.last, config.defaultLimit, config.maxLimit);
    const after = args.after ?? undefined;
    const before = args.before ?? undefined;

    const isForwardPagination = args.after != null || args.first != null;

    let pagination: RelayPagination<number>;
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

    const createCollabTextRecordMapper: PreFetchedArrayGetItemFn<
      CollabTextRecordMapper
    > = (index: number, updateSize) => {
      const queryRecord = async (query: DeepObjectQuery<RevisionRecordSchema>) => {
        const collabText = await this.collabText.query({
          records: {
            $pagination: pagination,
            ...query,
          },
        });
        updateSize(collabText?.records?.length);
        return collabText?.records?.[index];
      };

      return {
        parentId: () => this.id(),
        query: queryRecord,
      };
    };

    return {
      records: (ctx: ApiGraphQLContext, info: GraphQLResolveInfo) => {
        return withPreFetchedArraySize(createCollabTextRecordMapper, ctx, info);
      },
      edges: (ctx: ApiGraphQLContext, info: GraphQLResolveInfo) => {
        return withPreFetchedArraySize(
          (index, updateSize) => {
            const revisionRecordQuery = createCollabTextRecordMapper(index, updateSize);

            return {
              node: () => revisionRecordQuery,
              cursor: async () => {
                return (
                  await revisionRecordQuery.query({
                    revision: 1,
                  })
                )?.revision;
              },
            };
          },
          ctx,
          info
        );
      },
      pageInfo: () => {
        const getHeadAndTailRevision = async () => {
          const collabText = await this.collabText.query({
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
        };

        return {
          hasNextPage: async () => {
            const collabText = await getHeadAndTailRevision();
            if (!collabText) {
              return false;
            }
            const { tailRevision, headRevision } = collabText;

            if (isForwardPagination) {
              return (after ?? tailRevision) + first < headRevision;
            }

            if (before != null) {
              return before <= headRevision;
            }

            return false;
          },
          hasPreviousPage: async () => {
            const collabText = await getHeadAndTailRevision();
            if (!collabText) {
              return false;
            }
            const { tailRevision, headRevision } = collabText;

            if (isForwardPagination) {
              if (after != null) {
                return tailRevision < after;
              }

              return false;
            }

            return tailRevision + 1 < (args.before ?? headRevision + 1) - last;
          },
          startCursor: async () => {
            const collabText = await getHeadAndTailRevision();
            if (!collabText) {
              return null;
            }
            const { tailRevision, headRevision } = collabText;

            if (isForwardPagination) {
              if (after != null) {
                return Math.max(tailRevision + 1, after + 1);
              }

              return tailRevision + 1;
            }

            if (before != null) {
              return Math.max(tailRevision + 1, before - last);
            }

            return Math.max(tailRevision, headRevision - last) + 1;
          },
          endCursor: async () => {
            const collabText = await getHeadAndTailRevision();
            if (!collabText) {
              return null;
            }
            const { tailRevision, headRevision } = collabText;

            if (isForwardPagination) {
              if (after != null) {
                return Math.min(headRevision, after + first);
              }

              return Math.min(headRevision, tailRevision + first);
            }

            if (before != null) {
              return Math.max(tailRevision + 1, before - 1);
            }

            return headRevision;
          },
        };
      },
    };
  }
}
