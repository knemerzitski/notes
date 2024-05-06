import { Changeset, SerializedChangeset } from '../changeset/changeset';
import { SelectionRange } from '../client/selection-range';

export interface RevisionChangeset<T = Changeset> {
  revision: number;
  changeset: T;
}

export type SerializedRevisionChangeset = RevisionChangeset<SerializedChangeset>;

export type RevisionRecord<T = Changeset> = RevisionChangeset<T>;

/**
 * Record submitted by the client
 */
export interface SubmittedRevisionRecord<T = Changeset> extends RevisionRecord<T> {
  /**
   * Randomly user generated string when record is created.
   * Used for preventing duplicate submissions.
   */
  userGeneratedId: string;
  /**
   * Selection before change is composed
   */
  beforeSelection: SelectionRange;
  /**
   * Selection after change is composed
   */
  afterSelection: SelectionRange;
}

/**
 * Record processed by the server.
 */
export interface ServerRevisionRecord<T = Changeset> extends SubmittedRevisionRecord<T> {
  creatorUserId: string;
}
