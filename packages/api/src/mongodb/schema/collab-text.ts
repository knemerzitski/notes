import { ObjectId } from 'mongodb';

import { Changeset } from '~collab/changeset/changeset';
import { SelectionRange } from '~collab/client/selection-range';
import { RevisionChangeset, ServerRevisionRecord } from '~collab/records/record';
import { PartialBy } from '~utils/types';

/**
 * Embedded document for Note
 */
export interface CollabTextSchema<T = unknown> {
  headText: RevisionChangesetSchema<T>;
  tailText: RevisionChangesetSchema<T>;
  records: RevisionRecordSchema<T>[];
}

export type RevisionChangesetSchema<T = unknown> = RevisionChangeset<T>;

export type RevisionRecordSchema<T = unknown> = Omit<
  ServerRevisionRecord<T>,
  'creatorUserId' | 'beforeSelection' | 'afterSelection'
> & {
  creatorUserId: ObjectId;
  beforeSelection: SelectionRangeSchema;
  afterSelection: SelectionRangeSchema;
  /**
   * When record was inserted to DB
   */
  createdAt: Date;
};
export type SelectionRangeSchema = PartialBy<SelectionRange, 'end'>;
export type ChangesetSchema = Changeset;
