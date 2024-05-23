import { RevisionChangeset } from './record';

/**
 * Interface for querying server records.
 */
export interface ServerRecords<TRecord> {
  /**
   * tailText before oldest known record.
   */
  readonly tailText: RevisionChangeset;

  /**
   * Iterates through records from newest (headRevision) to oldest
   */
  newestRecordsIterable(headRevision: number): Iterable<Readonly<TRecord>>;

  /**
   * Get text at specific revision
   */
  getTextAt(revision: number): Readonly<RevisionChangeset>;
}

export interface LocalServerRecordsOptions<TRecord> {
  records?: TRecord[];
  tailText?: RevisionChangeset;
}
