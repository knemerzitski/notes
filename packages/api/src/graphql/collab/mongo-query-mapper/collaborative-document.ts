import {
  CollaborativeDocumentMapper,
  CollaborativeDocumentRecordConnectionMapper,
  RevisionChangesetMapper,
} from '../schema.mappers';
import {} from '../../../mongoose/models/collab/embedded/revision-changeset';
import {
  CollaborativeDocumentdocumentArgs,
  CollaborativeDocumentrecordsConnectionArgs,
} from '../../types.generated';
import { DBCollabText } from '../../../mongoose/models/collab/collab-text';
import { Changeset } from '~collab/changeset/changeset';
import {
  RelayArrayPaginationConfig,
  applyLimit,
} from '../../../mongoose/operations/pagination/relayArrayPagination';
import {
  RevisionChangesetQueryType,
  RevisionChangesetQuery,
} from './revision-changeset';
import { RevisionRecordQueryType, RevisionRecordQuery } from './revision-record';
import { MongoDocumentQuery } from '../../../mongoose/query-builder';

// TODO bad name
export type CollaborativeDocumentQueryType = Omit<
  DBCollabText,
  'headDocument' | 'tailDocument' | 'records'
> & {
  headDocument: RevisionChangesetQueryType;
  tailDocument: RevisionChangesetQueryType;
  records: RevisionRecordQueryType[];
};

export class CollaborativeDocumentQuery implements CollaborativeDocumentMapper {
  private query: MongoDocumentQuery<CollaborativeDocumentQueryType>;

  constructor(query: MongoDocumentQuery<CollaborativeDocumentQueryType>) {
    this.query = query;
  }

  async id() {
    return (await this.query.queryDocument({ _id: 1 }))?._id?.toString('base64');
  }

  headDocument(): RevisionChangesetMapper {
    return new RevisionChangesetQuery({
      queryDocument: async (change) => {
        return (
          await this.query.queryDocument({
            headDocument: change,
          })
        )?.headDocument;
      },
    });
  }

  tailDocument(): RevisionChangesetMapper {
    return new RevisionChangesetQuery({
      queryDocument: async (change) => {
        return (
          await this.query.queryDocument({
            tailDocument: change,
          })
        )?.tailDocument;
      },
    });
  }

  document({
    revision: targetRevision,
  }: CollaborativeDocumentdocumentArgs): RevisionChangesetMapper {
    return new RevisionChangesetQuery({
      queryDocument: async ({ revision, changeset }) => {
        if (!revision && !changeset) return {};

        if (!changeset) {
          return {
            revision: targetRevision,
          };
        }

        const [tailChangeset, rawDocument] = await Promise.all([
          this.tailDocument().changeset(),
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
    args: CollaborativeDocumentrecordsConnectionArgs,
    config: RelayArrayPaginationConfig
  ): CollaborativeDocumentRecordConnectionMapper {
    const first = applyLimit(args.first, config.defaultLimit, config.maxLimit);
    const last = applyLimit(args.last, config.defaultLimit, config.maxLimit);
    const after = args.after ? String(args.after) : undefined;
    const before = args.before ? String(args.before) : undefined;

    const isForwardPagination = args.after != null || args.first != null;
    const isBackwardPagination = args.before != null || args.last != null;

    return {
      edges: () => {
        return [
          ...[...new Array<undefined>(isForwardPagination ? first : 0)].map(
            (_, index) => {
              const revisionRecordQuery = new RevisionRecordQuery(this, {
                queryDocument: async (project) => {
                  return (
                    await this.query.queryDocument({
                      records: {
                        $query: project,
                        $pagination: {
                          after,
                          first,
                          index,
                        },
                      },
                    })
                  )?.records?.[0];
                },
              });

              return {
                node: () => revisionRecordQuery,
                cursor: async () => {
                  return String(await revisionRecordQuery.change().revision());
                },
              };
            }
          ),
          ...[...new Array<undefined>(isBackwardPagination ? last : 0)].map(
            (_, index) => {
              const revisionRecordQuery = new RevisionRecordQuery(this, {
                queryDocument: async (project) => {
                  return (
                    await this.query.queryDocument({
                      records: {
                        $query: project,
                        $pagination: {
                          before,
                          last,
                          index,
                        },
                      },
                    })
                  )?.records?.[0];
                },
              });

              return {
                node: () => revisionRecordQuery,
                cursor: async () => {
                  return String(await revisionRecordQuery.change().revision());
                },
              };
            }
          ),
        ];
      },
      pageInfo: () => {
        return {
          hasNextPage: async () => {
            const [tailRevision, headRevision] = await Promise.all([
              this.tailDocument().revision(),
              this.headDocument().revision(),
            ]);
            if (tailRevision == null || headRevision == null) return null;
            return (args.after ?? tailRevision) + first < headRevision;
          },
          hasPreviousPage: async () => {
            const [tailRevision, headRevision] = await Promise.all([
              this.tailDocument().revision(),
              this.headDocument().revision(),
            ]);
            if (tailRevision == null || headRevision == null) return null;
            return tailRevision + 1 < (args.before ?? headRevision + 1) - last;
          },
          startCursor: async () => {
            const tailRevision = await this.tailDocument().revision();
            if (tailRevision == null) return null;
            return String(tailRevision + 1);
          },
          endCursor: () => {
            return String(this.headDocument().revision());
          },
        };
      },
    };
  }
}
