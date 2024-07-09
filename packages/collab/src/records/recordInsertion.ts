import { Changeset } from '../changeset/changeset';

import { RevisionChangeset } from './record';
import { ServerInsertRecord, ServerRecord, newServerRecords } from './server-records';

interface RecordInsertionParams<
  TRecord extends ServerRecord<unknown>,
  TInsertRecord extends ServerInsertRecord & TRecord,
> {
  insertRecord: TInsertRecord;
  serializedRecords: Partial<TRecord>[] | undefined;
  serializedHeadText: unknown;
  headRevision: number | undefined;
}

enum RecordInsertionErrorCode {
  REVISION_INVALID,
  REVISION_OLD,
  CHANGESET_INVALID,
}

export class RecordInsertionError extends Error {
  readonly code: RecordInsertionErrorCode;

  constructor(code: RecordInsertionErrorCode, message?: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }
}

export default function recordInsertion<
  TRecord extends ServerRecord<unknown>,
  TInsertRecord extends ServerInsertRecord & TRecord,
>({
  insertRecord,
  serializedRecords,
  serializedHeadText,
  headRevision,
}: RecordInsertionParams<TRecord, TInsertRecord>):
  | {
      isExisting: false;
      newRecord: TInsertRecord;
      newHeadText: RevisionChangeset;
    }
  | {
      isExisting: true;
      existingRecord: Partial<TRecord> & ServerRecord;
    } {
  if (!serializedHeadText) {
    throw new Error(`Expected headText to be defined`);
  }

  if (headRevision == null) {
    throw new Error('Expected headRevision to be defined');
  }
  if (headRevision < insertRecord.revision) {
    throw new RecordInsertionError(
      RecordInsertionErrorCode.REVISION_INVALID,
      `Invalid revision. Expected insertion revision ${insertRecord.revision} to be before or same as HEAD revision ${headRevision}`
    );
  }
  const headText = {
    changeset: Changeset.parseValue(serializedHeadText),
    revision: headRevision,
  };

  if (!serializedRecords) {
    throw new Error('Expected records to be defined');
  }

  const firstRecordRevision = serializedRecords[0]?.revision;
  if (firstRecordRevision != null && insertRecord.revision < firstRecordRevision - 1) {
    throw new RecordInsertionError(
      RecordInsertionErrorCode.REVISION_OLD,
      `Revision is old. Expected insertion revision ${
        insertRecord.revision
      } to be after TAIL revision ${firstRecordRevision - 1}`
    );
  }

  if (serializedRecords.length === 0) {
    const newRecord = {
      ...insertRecord,
      revision: insertRecord.revision + 1,
    };
    const newHeadText = composeRecordOnHead(newRecord, headText);
    return {
      isExisting: false,
      newRecord,
      newHeadText,
    };
  }

  const records: (Partial<TRecord> & ServerRecord)[] = serializedRecords.map((record) => {
    if (!record.revision) {
      throw new Error('Expected record.revision to be defined');
    }
    if (!record.changeset) {
      throw new Error('Expected record.changeset to be defined');
    }
    if (!record.userGeneratedId) {
      throw new Error('Expected record.userGeneratedId to be defined');
    }
    return {
      ...record,
      revision: record.revision,
      changeset: Changeset.parseValue(record.changeset),
      userGeneratedId: record.userGeneratedId,
    };
  });

  const editorRevisionRecords = newServerRecords<
    Partial<TRecord> & ServerRecord,
    TInsertRecord
  >({
    records,
  });

  const insertion = editorRevisionRecords.insert(insertRecord);

  if (insertion.isExisting) {
    return {
      isExisting: true,
      existingRecord: insertion.processedRecord,
    };
  } else {
    return {
      isExisting: false,
      newRecord: insertion.processedRecord,
      newHeadText: composeRecordOnHead(insertion.processedRecord, headText),
    };
  }
}

function composeRecordOnHead<TRecord extends RevisionChangeset>(
  record: TRecord,
  headText: RevisionChangeset
): RevisionChangeset {
  try {
    return {
      revision: record.revision,
      changeset: headText.changeset.compose(record.changeset),
    };
  } catch (err) {
    if (err instanceof Error) {
      throw new RecordInsertionError(
        RecordInsertionErrorCode.CHANGESET_INVALID,
        'Invalid changeset. Cannot compose changeset on HEAD.'
      );
    } else {
      throw err;
    }
  }
}
