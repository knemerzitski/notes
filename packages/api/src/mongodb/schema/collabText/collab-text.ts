import { CollabText } from '~collab/adapters/mongodb/collab-text';

import { RevisionRecord } from '~collab/adapters/mongodb/collab-text';
import { Changeset } from '~collab/changeset/changeset';

import { CollectionDescription } from '../../collections';
import { ObjectId } from 'mongodb';
import { RevisionChangeset, SelectionRange } from '~collab/records/record';

export interface CollabTextSchema<T = unknown> extends CollabText<T> {
  _id: ObjectId;
}

export type RevisionChangesetSchema<T = unknown> = RevisionChangeset<T>;

export type RevisionRecordSchema<T = unknown> = RevisionRecord<T>;
export type SelectionRangeSchema = SelectionRange;
export type ChangesetSchema = Changeset;

export const collabTextDescription: CollectionDescription = {
  indexSpecs: [],
};
