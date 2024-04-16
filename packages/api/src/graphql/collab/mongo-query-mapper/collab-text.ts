import { CollabTextMapper, CollabTextWithNearHistoryMapper } from '../schema.mappers';
import { CollabTextSchema } from '../../../mongodb/schema/collabText/collab-text';
import {
  RelayArrayPaginationConfig,
  applyLimit,
} from '../../../mongodb/operations/pagination/relayArrayPagination';
import {
  RevisionChangesetQuery,
  RevisionChangesetQueryMapper,
} from './revision-changeset';
import { CollabTextRecordQuery, CollabTextRecordQueryMapper } from './revision-record';
import { MongoDocumentQuery } from '../../../mongodb/query-builder';
import { CollabTextrecordsConnectionArgs } from '../../types.generated';

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

  // document({
  //   revision: targetRevision,
  // }: CollaborativeDocumentdocumentArgs): RevisionChangesetMapper {
  //   return new RevisionChangesetQueryMapper({
  //     queryDocument: async ({ revision, changeset }) => {
  //       if (!revision && !changeset) return {};

  //       if (!changeset) {
  //         return {
  //           revision: targetRevision,
  //         };
  //       }

  //       const [tailChangeset, rawDocument] = await Promise.all([
  //         this.tailDocument().changeset(),
  //         this.query.queryDocument({
  //           records: {
  //             $query: {
  //               changeset: 1,
  //             },
  //             $pagination: {
  //               before: String(targetRevision + 1),
  //             },
  //           },
  //         }),
  //       ]);

  //       if (tailChangeset == null || rawDocument?.records == null) {
  //         return null;
  //       }

  //       const recordsChangesets = rawDocument.records.map((rawRecord) => {
  //         const serializedChangeset = rawRecord.changeset;
  //         if (serializedChangeset == null) {
  //           throw new Error('RevisionRecord.changeset is null');
  //         }

  //         return Changeset.parseValue(serializedChangeset);
  //       });

  //       return {
  //         revision: targetRevision,
  //         changeset: recordsChangesets.reduce((a, b) => a.compose(b), tailChangeset),
  //       };
  //     },
  //   });
  // }

  textWithNearHistory(): CollabTextWithNearHistoryMapper {
    throw new Error('Method not implemented.');
  }

  recordsConnection(
    args: CollabTextrecordsConnectionArgs,
    config: RelayArrayPaginationConfig
  ) {
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
              const revisionRecordQuery = new CollabTextRecordQueryMapper(this, {
                queryDocument: async (project) => {
                  return (
                    await this.query.queryDocument({
                      records: {
                        $query: project,
                        $pagination: {
                          after,
                          first,
                        },
                      },
                    })
                  )?.records?.[index];
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
              const revisionRecordQuery = new CollabTextRecordQueryMapper(this, {
                queryDocument: async (project) => {
                  return (
                    await this.query.queryDocument({
                      records: {
                        $query: project,
                        $pagination: {
                          before,
                          last,
                        },
                      },
                    })
                  )?.records?.[index];
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
              this.tailText().revision(),
              this.headText().revision(),
            ]);
            if (tailRevision == null || headRevision == null) return null;
            return (args.after ?? tailRevision) + first < headRevision;
          },
          hasPreviousPage: async () => {
            const [tailRevision, headRevision] = await Promise.all([
              this.tailText().revision(),
              this.headText().revision(),
            ]);
            if (tailRevision == null || headRevision == null) return null;
            return tailRevision + 1 < (args.before ?? headRevision + 1) - last;
          },
          startCursor: async () => {
            const tailRevision = await this.tailText().revision();
            if (tailRevision == null) return null;
            return tailRevision + 1;
          },
          endCursor: () => {
            return this.headText().revision();
          },
        };
      },
    };
  }
}
