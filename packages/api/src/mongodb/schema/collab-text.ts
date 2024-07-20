import { ObjectId } from 'mongodb';

import { Changeset } from '~collab/changeset/changeset';
import { SelectionRange } from '~collab/client/selection-range';
import { RevisionChangeset, ServerRevisionRecord } from '~collab/records/record';
import { PartialBy } from '~utils/types';

import { CollectionDescription } from '../collections';

import { UserNoteSchema } from './user-note';

export interface CollabTextSchema<T = unknown> {
  _id: ObjectId;

  userNotes: CollabTextUserNoteSchema[];

  headText: RevisionChangesetSchema<T>;
  tailText: RevisionChangesetSchema<T>;
  records: RevisionRecordSchema<T>[];
}

export interface CollabTextUserNoteSchema {
  /**
   * UserNote.id that references this CollabText
   */
  id: UserNoteSchema['_id'];
  /**
   * UserNote.userId
   */
  userId: UserNoteSchema['userId'];
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
  indexSpecs: [
    {
      key: { 'userNotes.id': 1 },
    },
    {
      key: { 'userNotes.userId': 1 },
    },
  ],
};
