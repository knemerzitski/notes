import { CollabTextMapper, RevisionChangesetMapper } from '../schema.mappers';
import { CollabTextSchema } from '../../../mongodb/schema/collab-text';
import {
  RelayArrayPaginationConfig,
  RelayPagination,
  applyLimit,
} from '../../../mongodb/operations/pagination/relayArrayPagination';
import {
  RevisionChangesetQuery,
  RevisionChangesetQueryMapper,
} from './revision-changeset';
import { CollabTextRecordQuery, CollabTextRecordQueryMapper } from './revision-record';
import { MongoDocumentQuery } from '../../../mongodb/query-builder';
import {
  CollabTextrecordsConnectionArgs,
  CollabTexttextAtRevisionArgs,
} from '../../types.generated';
import { newResolverOnlyError } from '../../plugins/remove-resolver-only-errors';
import { Changeset } from '~collab/changeset/changeset';

export type CollabTextQuery = Omit<
  CollabTextSchema,
  'headText' | 'tailText' | 'records'
> & {
  headText: RevisionChangesetQuery;
  tailText: RevisionChangesetQuery;
  records: CollabTextRecordQuery[];
};

export class CollabTextQueryMapper implements CollabTextMapper {
  private query: MongoDocumentQuery<CollabTextQuery>;

  constructor(query: MongoDocumentQuery<CollabTextQuery>) {
    this.query = query;
  }

  async id() {
    return (await this.query.queryDocument({ _id: 1 }))?._id?.toString('base64');
  }

  headText() {
    return new RevisionChangesetQueryMapper({
      queryDocument: async (change) => {
        return (
          await this.query.queryDocument({
            headText: change,
          })
        )?.headText;
      },
    });
  }

  tailText() {
    return new RevisionChangesetQueryMapper({
      queryDocument: async (change) => {
        return (
          await this.query.queryDocument({
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
      queryDocument: async ({ revision, changeset }) => {
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
          this.query.queryDocument({
            records: {
              $query: {
                changeset: 1,
              },
              $pagination: {
                before: String(targetRevision + 1),
              },
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
    let expectedSize: number;
    if (isForwardPagination) {
      pagination = {
        after,
        first,
      };
      expectedSize = first;
    } else {
      pagination = {
        before,
        last,
      };
      expectedSize = last;
    }

    return {
      records: () => {
        return [...new Array<undefined>(expectedSize)].map((_, index) => {
          const revisionRecordQuery = new CollabTextRecordQueryMapper(this, {
            queryDocument: async (query) => {
              const result = await this.query.queryDocument({
                records: {
                  $query: query,
                  $pagination: pagination,
                },
              });

              const record = result?.records?.[index];
              if (!record) {
                throw newResolverOnlyError(`No record at index ${index}`);
              }

              return record;
            },
          });

          return revisionRecordQuery;
        });
      },
      edges: () => {
        return [...new Array<undefined>(expectedSize)].map((_, index) => {
          const revisionRecordQuery = new CollabTextRecordQueryMapper(this, {
            queryDocument: async (query) => {
              const result = await this.query.queryDocument({
                records: {
                  $query: query,
                  $pagination: pagination,
                },
              });

              const record = result?.records?.[index];
              if (!record) {
                throw newResolverOnlyError(`No record at index ${index}`);
              }

              return record;
            },
          });

          return {
            node: () => revisionRecordQuery,
            cursor: async () => {
              return String(await revisionRecordQuery.change().revision());
            },
          };
        });
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
