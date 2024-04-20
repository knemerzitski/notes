import { CollabText } from '~collab/adapters/mongodb/collab-text';

import { RevisionRecord } from '~collab/adapters/mongodb/collab-text';
import { Changeset } from '~collab/changeset/changeset';

import { CollectionDescription } from '../../collections';
import { ObjectId } from 'mongodb';
import { DeepReplace } from '~utils/types';
import { RevisionChangeset, SelectionRange } from '~collab/records/record';

export type CollabTextSchema<T = unknown> = DeepReplace<CollabText, Changeset, T> & {
  _id: ObjectId;
};

export type RevisionChangesetSchema<T = unknown> = DeepReplace<
  RevisionChangeset,
  Changeset,
  T
>;
export type RevisionRecordSchema<T = unknown> = DeepReplace<RevisionRecord, Changeset, T>;
export type SelectionRangeSchema = SelectionRange;
export type ChangesetSchema = Changeset;

export const collabTextDescription: CollectionDescription = {
  indexSpecs: [],
};
