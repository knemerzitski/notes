import { assertHasProperties, parseNumber } from '~utils/serialize';
import { Changeset, SerializedChangeset } from '../changeset/changeset';
import { SelectionRange } from '../client/selection-range';

export interface RevisionChangeset<T = Changeset> {
  revision: number;
  changeset: T;
}

export type SerializedRevisionChangeset = RevisionChangeset<SerializedChangeset>;

export namespace RevisionChangeset {
  export function serialize(change: RevisionChangeset): SerializedRevisionChangeset {
    return {
      ...change,
      changeset: change.changeset.serialize(),
    };
  }

  export function parseValue(value: unknown): RevisionChangeset {
    assertHasProperties(value, ['revision', 'changeset']);

    return {
      revision: parseNumber(value.revision),
      changeset: Changeset.parseValue(value.changeset),
    };
  }

  export function parseValueMaybe(value: unknown): RevisionChangeset | undefined {
    if (value === undefined) return value;
    return parseValue(value);
  }
}

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

export type SerializedSubmittedRevisionRecord =
  SubmittedRevisionRecord<SerializedChangeset>;

export namespace SubmittedRevisionRecord {
  export function serialize(
    record: SubmittedRevisionRecord
  ): SerializedSubmittedRevisionRecord {
    return {
      ...record,
      changeset: record.changeset.serialize(),
    };
  }

  export function parseValue(value: unknown): SubmittedRevisionRecord {
    assertHasProperties(value, [
      'userGeneratedId',
      'changeset',
      'revision',
      'beforeSelection',
      'afterSelection',
    ]);

    return {
      userGeneratedId: String(value.userGeneratedId),
      changeset: Changeset.parseValue(value.changeset),
      revision: parseNumber(value.revision),
      beforeSelection: SelectionRange.parseValue(value.beforeSelection),
      afterSelection: SelectionRange.parseValue(value.afterSelection),
    };
  }
}

/**
 * Record processed by the server.
 */
export interface ServerRevisionRecord<T = Changeset> extends SubmittedRevisionRecord<T> {
  creatorUserId: string;
}

export type SerializedServerRevisionRecord = ServerRevisionRecord<SerializedChangeset>;

export namespace ServerRevisionRecord {
  export function serialize(
    record: ServerRevisionRecord
  ): SerializedServerRevisionRecord {
    return {
      ...record,
      changeset: record.changeset.serialize(),
    };
  }

  export function parseValue(value: unknown): ServerRevisionRecord {
    assertHasProperties(value, ['creatorUserId']);

    const submittedRecord = SubmittedRevisionRecord.parseValue(value);

    return {
      ...submittedRecord,
      creatorUserId: String(value.creatorUserId),
    };
  }
}
