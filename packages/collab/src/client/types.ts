import { Emitter } from 'mitt';
import { Changeset } from '../changeset';
import { SelectionRange } from './selection-range';
import { RevisionChangeset } from '../records/record';

export interface SimpleTextEvents {
  handledExternalChanges: readonly Readonly<{ changeset: Changeset; revision: number }>[];
  valueChanged: string;
  selectionChanged: Readonly<SelectionRange>;
}

export interface SimpleText {
  readonly eventBus: Emitter<SimpleTextEvents>;

  readonly value: string;

  /**
   * Insert value at selection. Anything selected is replaced with new value.
   */
  insert(
    value: string,
    selection: SelectionRange,
    options?: SimpleTextOperationOptions
  ): void;

  /**
   * Delete at selection. Anything selected is deleted before count.
   */
  delete(
    count: number,
    selection: SelectionRange,
    options?: SimpleTextOperationOptions
  ): void;
}

export interface SimpleTextOperationOptions {
  /**
   * Merge value with existing
   * @default false
   */
  merge?: boolean;
}

export interface SelectionChangeset {
  /**
   * Changeset to be composed
   */
  changeset: Changeset;
  /**
   * Selection after changeset is composed
   */
  afterSelection: SelectionRange;
  /**
   * Selection before changeset is composed
   */
  beforeSelection?: SelectionRange;
}

/**
 * Simple facade for querying server records.
 */
export interface ServerRecordsFacade<TRecord> {
  /**
   * tailText is a composition of all previous records before oldest record.
   */
  readonly tailText: Readonly<RevisionChangeset>;

  /**
   * Iterates through records from newest (headRevision) to oldest
   */
  newestRecordsIterable(headRevision: number): Iterable<Readonly<TRecord>>;

  /**
   * Get text at specific revision
   */
  getTextAt(revision: number): Readonly<RevisionChangeset>;
}
