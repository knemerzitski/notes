import { CollabText } from '~collab/adapters/mongodb/collab-text';

import { RevisionChangeset } from '~collab/records/revision-changeset';
import { RevisionRecord } from '~collab/adapters/mongodb/collab-text';
import { SelectionRange } from '~collab/adapters/mongodb/collab-text';
import { Changeset } from '~collab/changeset/changeset';

import { WithId } from 'mongodb';
import { CollectionDescription } from '../../collections';

export type CollabTextSchema<T = unknown> = WithId<CollabText<T>>;
export type RevisionChangesetSchema<T = unknown> = RevisionChangeset<T>;
export type RevisionRecordSchema<T = unknown> = RevisionRecord<T>;
export type SelectionRangeSchema = SelectionRange;
export type ChangesetSchema = Changeset;

export const collabTextDescription: CollectionDescription = {
  indexSpecs: [],
};
