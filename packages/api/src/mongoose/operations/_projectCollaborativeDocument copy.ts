import { PipelineStage, Require_id } from 'mongoose';
import { DBCollabText } from '../models/collab/collab-text';

type RecordsRange = RevisionRecordsRange & IndexRecordsRange;

interface RevisionRecordsRange {
  /**
   * Slice records starting from this revision. If not defined then
   * start from first record.
   */
  startRevision?: number;
  /**
   * Slice records ending with this revision (inclusive). If not defined then
   * end with last revision.
   */
  endRevision?: number;
}

interface IndexRecordsRange {
  /**
   * Start index of slice. Negative index counts from end of records.
   * Leave undefined to start from beginning of records.
   */
  start?: PositiveOrNegativeIndex;
  /**
   * End index of slice (exclusive). Negative index counts from end of records.
   * Leave undefined to end from end of records.
   */
  end?: PositiveOrNegativeIndex;
}

interface PositiveOrNegativeIndex {
  /**
   * Positive number count from beginning of records
   */
  forward?: number;
  /**
   * Negative number counting from end of records
   */
  backward?: number;
}

export interface ProjectCollaborativeDocumentInput {
  headDocument?: boolean;
  tailDocument?: boolean;
  records?: RecordsRange;
}

export type ProjectCollaborativeDocumentOutput<T = unknown> = Require_id<
  Partial<DBCollabText<T>> & {
    recordsMeta?: {
      tailDocumentRevision: number;
      recordsSize: number;
    };
  }
>;

export default function projectCollaborativeDocument({
  headDocument,
  tailDocument,
  records,
}: ProjectCollaborativeDocumentInput) {
  const projection: PipelineStage.Project['$project'] = {};

  if (headDocument) {
    projection.headDocument = '$headDocument';
  }
  if (tailDocument) {
    projection.tailDocument = '$tailDocument';
  }
  if (records) {
    projection.records = {
      $let: {
        vars: {
          start: {
            $max: [
              0,
              {
                $min: [
                  records.start?.forward,
                  { $add: [records.start?.backward, { $size: '$records' }] },
                  {
                    $subtract: [
                      records.startRevision,
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
                  records.end?.forward,
                  { $add: [records.end?.backward, { $size: '$records' }, 1] },
                  {
                    $subtract: [records.endRevision, '$tailDocument.revision'],
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

    projection.recordsMeta = {
      tailDocumentRevision: '$tailDocument.revision',
      recordsSize: { $size: '$records' },
    };
  }

  return projection;
}
