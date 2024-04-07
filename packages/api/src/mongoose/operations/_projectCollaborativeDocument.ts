import { Expression, PipelineStage } from 'mongoose';
import { DBCollabText } from '../models/collab/collab-text';
import { DBRevisionChangeset } from '../models/collab/embedded/revision-changeset';
import { DBRevisionRecord } from '../models/collab/embedded/revision-record';
import { DBSelectionRange } from '../models/collab/embedded/selection-range';
import { CollaborativeDocumentRevisionRecordsPaginationInput } from './revisionRecordsPagination';

type MaybeBoolean<T> = T | boolean;

type ProjectSelectionRange = Record<keyof DBSelectionRange, boolean>;

type ProjectRevisionChangeset = Record<keyof DBRevisionChangeset<unknown>, boolean>;

type ProjectRevisionRecord = Record<
  keyof Omit<DBRevisionRecord<unknown>, 'change' | 'beforeSelection' | 'afterSelection'>,
  Expression
> & {
  change: MaybeBoolean<ProjectRevisionChangeset>;
  beforeSelection: MaybeBoolean<ProjectSelectionRange>;
  afterSelection: MaybeBoolean<ProjectSelectionRange>;
};

type ProjectCollaborativeDocument = Record<
  keyof Omit<
    DBCollabText<unknown>,
    'headDocument' | 'tailDocument' | 'records'
  >,
  Expression
> & {
  headDocument: MaybeBoolean<ProjectRevisionChangeset>;
  tailDocument: MaybeBoolean<ProjectRevisionChangeset>;
  beforeSelection: MaybeBoolean<ProjectSelectionRange>;
  records: {
    projection: MaybeBoolean<ProjectRevisionRecord>;
    pagination: CollaborativeDocumentRevisionRecordsPaginationInput;
  };
};

interface ProjectCollaborativeDocumentInput {
  input: ProjectCollaborativeDocument;
}

export default function projectCollaborativeDocument({
  input,
}: ProjectCollaborativeDocumentInput) {
  const projection: PipelineStage.Project['$project'] = {};


  if(input.headDocument){
    if(typeof input.headDocument === 'boolean'){
      
    }
    projection.headDocument = '$headDocument';
  }

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
