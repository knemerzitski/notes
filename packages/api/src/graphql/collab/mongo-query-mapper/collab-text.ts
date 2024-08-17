import { GraphQLResolveInfo } from 'graphql';

import { Changeset } from '~collab/changeset/changeset';

import {
  RelayArrayPaginationConfig,
  RelayPagination,
  applyLimit,
} from '../../../mongodb/pagination/relay-array-pagination';
import { MongoQuery } from '../../../mongodb/query/query';
import { ApiGraphQLContext } from '../../context';
import {
  CollabTextrecordsConnectionArgs,
  CollabTexttextAtRevisionArgs,
  ResolverTypeWrapper,
} from '../../types.generated';
import { CollabTextMapper, RevisionChangesetMapper } from '../schema.mappers';

import { RevisionChangesetQueryMapper } from './revision-changeset';
import { CollabTextRecordQueryMapper } from './revision-record';
import {
  PreFetchedArrayGetItemFn,
  withPreFetchedArraySize,
} from '../../utils/with-pre-fetched-array-size';
import { QueryableCollabTextSchema } from '../../../mongodb/schema/collab-text/query/collab-text';

export abstract class CollabTextQueryMapper implements CollabTextMapper {
  private collabText: MongoQuery<QueryableCollabTextSchema>;

  constructor(collabText: MongoQuery<QueryableCollabTextSchema>) {
    this.collabText = collabText;
  }

  abstract id(): ResolverTypeWrapper<string>;

  headText() {
    return new RevisionChangesetQueryMapper({
      query: async (change) => {
        return (
          await this.collabText.query({
            headText: change,
          })
        )?.headText;
      },
    });
  }

  tailText() {
    return new RevisionChangesetQueryMapper({
      query: async (change) => {
        return (
          await this.collabText.query({
            tailText: change,
          })
        )?.tailText;
      },
    });
  }

  textAtRevision({
    revision: targetRevision,
  }: CollabTexttextAtRevisionArgs): RevisionChangesetMapper {
    return new RevisionChangesetQueryMapper({
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

        const [tailChangeset, rawDocument] = await Promise.all([
          this.tailText().changeset(),
          this.collabText.query({
            records: {
              $pagination: {
                before: targetRevision + 1,
              },
              changeset: 1,
            },
          }),
        ]);

        if (tailChangeset == null || rawDocument?.records == null) {
          return null;
        }

        const recordsChangesets = rawDocument.records.map((rawRecord) => {
          const serializedChangeset = rawRecord.changeset;
          if (serializedChangeset == null) {
            throw new Error('RevisionRecord.changeset is null');
          }

          return Changeset.parseValue(serializedChangeset);
        });

        return {
          revision: targetRevision,
          changeset: recordsChangesets.reduce((a, b) => a.compose(b), tailChangeset),
        };
      },
    });
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
      CollabTextRecordQueryMapper
    > = (index: number, updateSize) => {
      const revisionRecordQuery = new CollabTextRecordQueryMapper(this, {
        query: async (query) => {
          const result = await this.collabText.query({
            records: {
              $pagination: pagination,
              ...query,
            },
          });
          updateSize(result?.records?.length);
          return result?.records?.[index];
        },
      });

      return revisionRecordQuery;
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
                return String(await revisionRecordQuery.change().revision());
              },
            };
          },
          ctx,
          info
        );
      },
      pageInfo: () => {
        return {
          hasNextPage: async () => {
            const [tailRevision, headRevision] = await Promise.all([
              this.tailText().revision(),
              this.headText().revision(),
            ]);
            if (tailRevision == null || headRevision == null) return false;

            if (isForwardPagination) {
              return (after ?? tailRevision) + first < headRevision;
            }

            if (before != null) {
              return before <= headRevision;
            }

            return false;
          },
          hasPreviousPage: async () => {
            const [tailRevision, headRevision] = await Promise.all([
              this.tailText().revision(),
              this.headText().revision(),
            ]);

            if (tailRevision == null || headRevision == null) return false;

            if (isForwardPagination) {
              if (after != null) {
                return tailRevision < after;
              }

              return false;
            }

            return tailRevision + 1 < (args.before ?? headRevision + 1) - last;
          },
          startCursor: async () => {
            const [tailRevision, headRevision] = await Promise.all([
              this.tailText().revision(),
              this.headText().revision(),
            ]);

            if (tailRevision == null || headRevision == null) return null;

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
            const [tailRevision, headRevision] = await Promise.all([
              this.tailText().revision(),
              this.headText().revision(),
            ]);

            if (tailRevision == null || headRevision == null) return null;

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
