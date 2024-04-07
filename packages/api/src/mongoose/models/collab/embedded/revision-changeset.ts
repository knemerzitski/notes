import { Schema } from 'mongoose';
import { RevisionChangeset } from '~collab/records/revision-changeset';
import { changesetField } from './changeset-field';

export type DBRevisionChangeset<T = unknown> = RevisionChangeset<T>;

export const revisionChangesetSchema = new Schema<DBRevisionChangeset>(
  {
    changeset: changesetField,
    revision: {
      type: Schema.Types.Number,
      required: true,
    },
  },
  {
    _id: false,
  }
);
