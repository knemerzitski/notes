import DataLoader from 'dataloader';
import { ObjectId } from 'mongodb';
import {
  CollabTextModel,
  CollabTextSchema,
} from '../../../mongodb/schema/collabText/collab-text';
import { PipelineStage, Require_id } from 'mongoose';
import { Changeset } from '~collab/changeset/changeset';
import { RevisionChangeset } from '~collab/records/revision-changeset';

import util from 'util';

interface DataSourceKey {
  id: ObjectId;
  headDocument?: boolean;
  tailDocument?: boolean;
  records?: RecordsRange;
}

type RecordsRange = RevisionRecordsRange & IndexRecordsRange;

interface RevisionRecordsRange {
  startRevision?: number;
  endRevision?: number;
}

interface IndexRecordsRange {
  start?: PositiveOrNegativeIndex;
  end?: PositiveOrNegativeIndex;
}

interface PositiveOrNegativeIndex {
  forward?: number;
  backward?: number;
}

type AggregateCollaborativeDocument<T = unknown> = Require_id<
  Partial<CollabTextSchema<T>> & {
    recordsMeta?: {
      tailDocumentRevision: number;
      recordsSize: number;
    };
  }
>;

export class CollaborativeDocumentsDataSource {
  private Model: CollabTextModel;

  constructor(Model: CollabTextModel) {
    this.Model = Model;
  }

  private loader = new DataLoader<
    DataSourceKey,
    AggregateCollaborativeDocument<Changeset> | undefined
  >(async (requestedKeys) => {
    // console.log('load', util.inspect(requestedKeys, false, null, true));
    const unionKey = this.mergeKeysToOne(requestedKeys);
    const uniqueIds = this.uniqueIds(requestedKeys);

    const projection: PipelineStage.Project = {
      $project: {},
    };
    if (unionKey.headDocument) {
      projection.$project.headDocument = 1;
    }
    if (unionKey.tailDocument) {
      projection.$project.tailDocument = 1;
    }
    if (unionKey.records) {
      unionKey.records.start?.forward;
      projection.$project.records = {
        $let: {
          vars: {
            start: {
              $max: [
                0,
                {
                  $min: [
                    unionKey.records.start?.forward,
                    { $add: [unionKey.records.start?.backward, { $size: '$records' }] },
                    {
                      $subtract: [
                        unionKey.records.startRevision,
                        { $add: ['$tailDocument.revision', 1] },
                      ],
                    },
                  ],
                },
              ],
            },
            endExclusive: {
              $min: [
                { $size: '$records' },
                {
                  $max: [
                    unionKey.records.end?.forward,
                    { $add: [unionKey.records.end?.backward, { $size: '$records' }, 1] },
                    {
                      $subtract: [unionKey.records.endRevision, '$tailDocument.revision'],
                    },
                  ],
                },
              ],
            },
          },
          in: {
            $slice: ['$records', '$$start', { $subtract: ['$$endExclusive', '$$start'] }],
          },
        },
      };

      projection.$project.recordsMeta = {
        tailDocumentRevision: '$tailDocument.revision',
        recordsSize: { $size: '$records' },
      };
    }

    // console.log('id', uniqueIds);
    // console.log('projection', util.inspect(projection, false, null, true));
    const docList = await this.Model.aggregate<AggregateCollaborativeDocument>([
      {
        $match: {
          _id: {
            $in: uniqueIds,
          },
        },
      },
      projection,
    ]);
    // console.log('result', util.inspect(docList, false, null, true));

    const docIdToDocMap = docList.reduce<
      Record<string, AggregateCollaborativeDocument<Changeset>>
    >((mapping, doc) => {
      mapping[doc._id.toString()] = this.parseChangesets(doc);
      return mapping;
    }, {});

    return requestedKeys.map((key) => docIdToDocMap[key.id.toString()]);
  });

  async get(key: DataSourceKey): Promise<AggregateCollaborativeDocument<Changeset>> {
    const item = await this.loader.load(key);
    if (!item) {
      throw new Error(`Failed to resolve CollaborativeDocument ${String(key.id)}`);
    }
    return item;
  }

  private parseChangesets(
    doc: AggregateCollaborativeDocument
  ): AggregateCollaborativeDocument<Changeset> {
    return {
      ...doc,
      headDocument: this.parseRevisionChangeset(doc.headDocument),
      tailDocument: this.parseRevisionChangeset(doc.tailDocument),
      records: this.parseRecords(doc.records),
    };
  }

  private parseRecords(
    records?: AggregateCollaborativeDocument['records']
  ): AggregateCollaborativeDocument<Changeset>['records'] | undefined {
    if (!records) return;

    return records.map((record) => ({
      ...record,
      change: {
        ...record.change,
        changeset: Changeset.parseValue(record.change.changeset),
      },
    }));
  }

  private parseRevisionChangeset(
    change?: RevisionChangeset<unknown>
  ): RevisionChangeset | undefined {
    if (!change) return;

    return {
      ...change,
      changeset: Changeset.parseValue(change.changeset),
    };
  }

  private uniqueIds(keys: Readonly<DataSourceKey[]>): ObjectId[] {
    return Object.values(
      keys.reduce<Record<string, ObjectId>>((merged, key) => {
        merged[key.id.toString()] = key.id;
        return merged;
      }, {})
    );
  }

  private mergeKeysToOne(keys: Readonly<DataSourceKey[]>): DataSourceKey {
    return keys.reduce((to, from) => {
      this.mergeKey(to, from);
      return to;
    });
  }

  private mergeKey(to: DataSourceKey, from: DataSourceKey) {
    if (from.headDocument) {
      to.headDocument = true;
    }
    if (from.tailDocument) {
      to.tailDocument = true;
    }
    if (from.records) {
      if (to.records) {
        this.mergeRecordsRange(to.records, from.records);
      } else {
        to.records = from.records;
      }
    }
  }

  private mergeRecordsRange(to: RecordsRange, from: RecordsRange) {
    this.mergeRevisionRecordsRange(to, from);
    this.mergeIndexRecordsRange(to, from);
  }

  private mergeRevisionRecordsRange(
    to: RevisionRecordsRange,
    from: RevisionRecordsRange
  ) {
    if (from.startRevision != null) {
      if (to.startRevision != null) {
        to.startRevision = Math.min(to.startRevision, from.startRevision);
      } else {
        to.startRevision = from.startRevision;
      }
    }

    if (from.endRevision != null) {
      if (to.endRevision != null) {
        to.endRevision = Math.max(to.endRevision, from.endRevision);
      } else {
        to.endRevision = from.endRevision;
      }
    }
  }

  private mergeIndexRecordsRange(to: IndexRecordsRange, from: IndexRecordsRange) {
    if (from.start) {
      if (to.start) {
        this.mergePositiveOrNegativeIndex(to.start, from.start, Math.min);
      } else {
        to.start = from.start;
      }
    }

    if (from.end) {
      if (to.end) {
        this.mergePositiveOrNegativeIndex(to.end, from.end, Math.max);
      } else {
        to.end = from.end;
      }
    }
  }

  private mergePositiveOrNegativeIndex(
    to: PositiveOrNegativeIndex,
    from: PositiveOrNegativeIndex,
    op: (...values: number[]) => number
  ) {
    if (from.forward != null) {
      if (to.forward != null) {
        to.forward = op(to.forward, from.forward);
      } else {
        to.forward = from.forward;
      }
    }

    if (from.backward != null) {
      if (to.backward != null) {
        to.backward = op(to.backward, from.backward);
      } else {
        to.backward = from.backward;
      }
    }
  }
}

export class CollaborativeDocumentDataSource {
  readonly id: ObjectId;

  private source: CollaborativeDocumentsDataSource;

  constructor(source: CollaborativeDocumentsDataSource, id: ObjectId) {
    this.source = source;
    this.id = id;
  }

  async getHeadDocument() {
    const headDocument = (
      await this.source.get({
        id: this.id,
        headDocument: true,
      })
    ).headDocument;

    if (headDocument == null) {
      throw new Error(
        `Failed to resolve CollaborativeDocument ${String(this.id)} headDocument field`
      );
    }

    return headDocument;
  }

  async getDocumentAtRevision(revision: number): Promise<RevisionChangeset> {
    const [tailDocument, records] = await Promise.all([
      this.getTailDocument(),
      this.getRecordsByRevision({ endRevision: revision }),
    ]);

    const lastRecord = records[records.length - 1];
    if (!lastRecord) {
      return tailDocument;
    }

    return {
      revision: lastRecord.change.revision,
      changeset: records.reduce(
        (a, b) => a.compose(b.change.changeset),
        tailDocument.changeset
      ),
    };
  }

  async getTailDocument(): Promise<CollabTextSchema['tailDocument']> {
    const tailDocument = (
      await this.source.get({
        id: this.id,
        tailDocument: true,
      })
    ).tailDocument;

    if (tailDocument == null) {
      throw new Error(
        `Failed to resolve CollaborativeDocument ${String(this.id)} tailDocument field`
      );
    }

    return tailDocument;
  }

  async getRecordsByRevision({
    startRevision,
    endRevision,
  }: {
    startRevision?: number;
    endRevision?: number;
  }): Promise<CollabTextSchema['records']> {
    const doc = await this.source.get({
      id: this.id,
      records: {
        startRevision,
        endRevision,
      },
    });

    if (!doc.records) {
      throw new Error(
        `Failed to resolve CollaborativeDocument ${String(
          this.id
        )} records field from revision ${startRevision} to ${endRevision}`
      );
    }

    const firstRecord = doc.records[0];
    if (!firstRecord) return [];

    const firstRevision = firstRecord.change.revision;

    const localStart = startRevision != null ? startRevision - firstRevision : 0;
    const localEnd =
      endRevision != null ? endRevision - firstRevision + 1 : doc.records.length;

    return doc.records.slice(localStart, localEnd);
  }

  /**
   *
   * @param start Start index
   * @param end End index. Is exclusive. Negative index starts from end of array. -1 includes last element.
   */
  async getRecordsBySlice(
    start: number,
    end: number = start + 1
  ): Promise<CollabTextSchema['records']> {
    const doc = await this.source.get({
      id: this.id,
      records: {
        start:
          start >= 0
            ? {
                forward: start,
              }
            : {
                backward: start,
              },
        end:
          end >= 0
            ? {
                forward: end,
              }
            : {
                backward: end,
              },
      },
    });

    if (!doc.records || !doc.recordsMeta) {
      throw new Error(
        `Failed to resolve CollaborativeDocument ${String(
          this.id
        )} records field slice from ${start} to ${end}`
      );
    }

    const firstRecord = doc.records[0];
    if (!firstRecord) return [];

    const firstRevision = firstRecord.change.revision;
    const recordSize = doc.recordsMeta.recordsSize;
    const recordsOffset = doc.recordsMeta.tailDocumentRevision - firstRevision + 1;

    const localStart = start + (start < 0 ? recordSize : 0) + recordsOffset;
    const localEnd = end + (end < 0 ? recordSize + 1 : 0) + recordsOffset;

    return doc.records.slice(localStart, localEnd);
  }
}

