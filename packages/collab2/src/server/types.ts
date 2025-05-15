import { Changeset } from '../common/changeset';
import { Selection } from '../common/selection';

export interface ServerState {
  tailRecord: TailRecord;
  records: ServerRecord[];
  headRecord: HeadRecord;
}

interface BaseRecord {
  readonly changeset: Changeset;
  readonly selectionInverse: Selection;
  readonly selection: Selection;
}

/**
 * ServerRecord is sequentially revisioned.
 * Each change is a new record. Older records are never modified.
 */
export interface ServerRecord extends BaseRecord {
  readonly revision: number;
  readonly authorId: string;
  readonly idempotencyId: string;
  readonly inverse: Changeset;
}

export interface TextRecord {
  readonly revision: number;
  /**
   * Contains single insertion that can be accessed with `getText()`
   */
  readonly text: Changeset;
}

/**
 * Composed oldest record. Is starting point for all other ServerRecords
 */
export type TailRecord = TextRecord;

/**
 * Composition of all records. Is most up to date version of the text.
 */
export type HeadRecord = TextRecord;

export interface SubmittedRecord extends BaseRecord {
  /**
   * User generated random unique string when record is created.
   * Used to avoid accidentaly duplicate submissions (ensures idempotency).
   */
  readonly id: string;
  /**
   * User who created this record
   */
  readonly authorId: string;
  readonly targetRevision: number;
}
