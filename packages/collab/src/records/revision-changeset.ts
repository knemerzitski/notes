import { Changeset, SerializedChangeset } from '../changeset/changeset';

export interface RevisionChangeset<T = Changeset> {
  revision: number;
  changeset: T;
}

export type SerializedRevisionChangeset = RevisionChangeset<SerializedChangeset>;
