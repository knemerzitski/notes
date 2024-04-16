import { CollabText } from '~collab/adapters/mongodb/collab-text';

import { RevisionChangeset } from '~collab/records/revision-changeset';
import { RevisionRecord } from '~collab/adapters/mongodb/collab-text';
import { SelectionRange } from '~collab/adapters/mongodb/collab-text';
import { Changeset } from '~collab/changeset/changeset';

import { CollectionDescription } from '../../collections';
import { ObjectId } from 'mongodb';

export type CollabTextSchema<T = unknown> = CollabText<T> & {
  _id: ObjectId;
};
export type RevisionChangesetSchema<T = unknown> = RevisionChangeset<T>;
export type RevisionRecordSchema<T = unknown> = RevisionRecord<T>;
export type SelectionRangeSchema = SelectionRange;
export type ChangesetSchema = Changeset;

export const collabTextDescription: CollectionDescription = {
  indexSpecs: [],
};
