import { ReadonlyDeep } from '../../../utils/src/types';

import { Changeset, ChangesetOperationError } from '../changeset';
import { SelectionRange } from '../client/selection-range';

import { RevisionChangeset, ServerRevisionRecord } from './record';
import { RevisionArray } from './revision-array';

type InsertRecordErrorCode = 'REVISION_INVALID' | 'REVISION_OLD';

export class InsertRecordError extends ChangesetOperationError {
  readonly code: InsertRecordErrorCode;

  constructor(code: InsertRecordErrorCode, message?: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }
}

type BaseRecord = ReadonlyDeep<ServerRevisionRecord, Changeset> &
  Pick<ServerRevisionRecord, 'afterSelection' | 'beforeSelection' | 'changeset'>;

/**
 * Processes inserton of a new record into array of records.
 * Does not modify or add to records.
 * @returns Data needed to insert the processed record
 */
export function processRecordInsertion<TRecord extends BaseRecord>(params: {
  records?: RevisionArray<TRecord> | readonly TRecord[];
  tailText?: Readonly<RevisionChangeset>;
  newRecord: Readonly<TRecord>;
}):
  | {
      type: 'duplicate';
      record: TRecord;
    }
  | {
      type: 'new';
      record: TRecord;
    };
export function processRecordInsertion<TRecord extends BaseRecord>(params: {
  records?: RevisionArray<TRecord> | readonly TRecord[];
  headText: Readonly<RevisionChangeset>;
  newRecord: Readonly<TRecord>;
}):
  | {
      type: 'duplicate';
      record: TRecord;
    }
  | {
      type: 'new';
      record: TRecord;
      headText: RevisionChangeset;
    };
export function processRecordInsertion<TRecord extends BaseRecord>({
  records = [],
  headText,
  tailText,
  newRecord,
}: {
  records?: RevisionArray<TRecord> | readonly TRecord[];
  tailText?: Readonly<RevisionChangeset>;
  headText?: Readonly<RevisionChangeset>;
  newRecord: Readonly<TRecord>;
}):
  | {
      type: 'duplicate';
      record: TRecord;
    }
  | {
      type: 'new';
      record: TRecord;
      headText?: RevisionChangeset;
    } {
  records = records instanceof RevisionArray ? records : new RevisionArray(records);

  if (headText) {
    if (records.newestRevision != null && records.newestRevision !== headText.revision) {
      throw new Error(
        `Unexpected headText and newest revision is not equal. Newest revision: ${records.newestRevision}, headText.revision: ${headText.revision}`
      );
    }
  }

  if (tailText) {
    if (
      records.oldestRevision != null &&
      records.oldestRevision !== tailText.revision + 1
    ) {
      throw new Error(
        `Unexpected oldest revision is not after tailText. Oldest revision: ${records.oldestRevision}, tailText.revision: ${tailText.revision}`
      );
    }
  }

  const newestRevision =
    headText?.revision ?? records.newestRevision ?? (newRecord.revision === 0 ? 0 : null);
  const oldestRevision = tailText?.revision ?? records.oldestRevision ?? 0;

  const targetRevision = newestRevision ?? oldestRevision;

  const deltaRevision = newRecord.revision - targetRevision;
  let startRecordIndex = records.length + deltaRevision;
  if (!(0 <= startRecordIndex && startRecordIndex <= records.length)) {
    if (headText?.revision === newRecord.revision) {
      startRecordIndex = records.length;
    } else if (tailText?.revision === newRecord.revision) {
      startRecordIndex = 0;
    } else {
      const oldestRevision = records.oldestRevision ?? headText?.revision;
      if (oldestRevision != null && newRecord.revision < oldestRevision) {
        throw new InsertRecordError(
          'REVISION_OLD',
          `Missing older records to insert new record. Oldest revision: ${oldestRevision}, Insert revision: ${newRecord.revision}`
        );
      } else if (newestRevision != null && newestRevision < newRecord.revision) {
        throw new InsertRecordError(
          'REVISION_INVALID',
          `Cannot insert record after headText. headText revision: ${newestRevision}, Insert revision: ${newRecord.revision}`
        );
      } else {
        throw new Error(
          `Unexpected missing records to insert record (no records). Insert revision ${newRecord.revision}`
        );
      }
    }
  }

  const resultRecord: TRecord = {
    ...newRecord,
    revision: targetRevision + 1,
  };

  let expectedNextRevision = newRecord.revision + 1;
  for (let i = startRecordIndex; i < records.length; i++) {
    const record = records.at(i);
    if (!record) continue;
    if (expectedNextRevision !== record.revision) {
      throw new Error(
        `Unexpected records not sequence. Expected revision '${expectedNextRevision}' but is '${record.revision}'`
      );
    }

    if (isRecordsEqual(record, resultRecord)) {
      return {
        type: 'duplicate' as const,
        record,
      };
    }

    resultRecord.beforeSelection = SelectionRange.closestRetainedPosition(
      resultRecord.beforeSelection,
      record.changeset
    );

    resultRecord.afterSelection = SelectionRange.closestRetainedPosition(
      resultRecord.afterSelection,
      resultRecord.changeset.follow(record.changeset)
    );

    resultRecord.changeset = record.changeset.follow(resultRecord.changeset);

    expectedNextRevision++;
  }

  return {
    type: 'new' as const,
    record: resultRecord,
    ...(headText && {
      headText: {
        revision: resultRecord.revision,
        changeset: headText.changeset.compose(resultRecord.changeset),
      },
    }),
  };
}

function isRecordsEqual<T extends BaseRecord>(record1: T, record2: T) {
  // Different generated id
  if (record1.userGeneratedId !== record2.userGeneratedId) return false;

  // Different user
  if (record1.creatorUserId !== record2.creatorUserId) {
    return false;
  }

  // Different changeset
  if (!record1.changeset.isEqual(record1.changeset)) {
    return false;
  }

  // Different selections
  if (!SelectionRange.isEqual(record1.afterSelection, record2.afterSelection)) {
    return false;
  }
  if (!SelectionRange.isEqual(record1.beforeSelection, record2.beforeSelection)) {
    return false;
  }

  return true;
}
