import { Changeset } from '~collab/changeset/changeset';

import { CollectionDescription } from '../collections';
import { ObjectId } from 'mongodb';
import { RevisionChangeset, ServerRevisionRecord } from '~collab/records/record';
import { SelectionRange } from '~collab/client/selection-range';
import { PartialBy } from '~utils/types';

export interface CollabTextSchema<T = unknown> {
  _id: ObjectId;
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
};
export type SelectionRangeSchema = PartialBy<SelectionRange, 'end'>;
export type ChangesetSchema = Changeset;

export const collabTextDescription: CollectionDescription = {
  indexSpecs: [],
};
