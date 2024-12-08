import { Changeset } from '../changeset';

export interface BaseComposableRecord {
  changeset: Changeset;
}

export interface ComposableRecords<
  TRecord extends BaseComposableRecord = BaseComposableRecord,
> {
  tailText: Changeset;
  readonly length: number;
  at(index: number): TRecord | undefined;
  push(record: TRecord): void;
  splice(start: number, deleteCount: number, ...records: TRecord[]): void;
  clear(): void;
}

/**
 * Ensures that any records passing through this facade will be composable
 */
export class ComposableRecordsFacade<TRecord extends BaseComposableRecord> {
  constructor(private readonly records: ComposableRecords<TRecord>) {
    if (records.tailText.hasRetainStrips()) {
      throw new Error(`Invalid tailText ${String(records.tailText)}`);
    }

    const firstRecord = records.at(0);
    if (firstRecord) {
      records.tailText.assertIsComposable(firstRecord.changeset);
    }

    for (let i = 1; i < records.length; i++) {
      const r0 = records.at(i - 1);
      const r1 = records.at(i);
      if (r0 && r1) {
        r0.changeset.assertIsComposable(r1.changeset);
      }
    }
  }

  push(record: TRecord) {
    const lastRecord = this.records.at(this.records.length - 1);
    if (lastRecord) {
      lastRecord.changeset.assertIsComposable(record.changeset);
    }

    this.records.push(record);
  }

  /**
   * Delete records [deleteStartIndex, record.length - 1]
   * and then push the record
   */
  deleteFromThenPush(deleteStartIndex: number, record: TRecord) {
    if (deleteStartIndex <= 0) {
      const tailText = this.records.tailText;
      tailText.assertIsComposable(record.changeset);

      this.records.clear();
      this.records.push(record);
    } else {
      const recordBeforeDelete = this.records.at(deleteStartIndex - 1);
      if (recordBeforeDelete) {
        recordBeforeDelete.changeset.assertIsComposable(record.changeset);
      }

      // +1 or not?
      this.records.splice(
        deleteStartIndex,
        this.records.length - deleteStartIndex,
        record
      );
    }
  }

  replaceTailText(tailText: Changeset) {
    if (tailText.hasRetainStrips()) {
      throw new Error(`Invalid tailText ${String(tailText)}`);
    }

    const firstRecord = this.records.at(0);
    if (firstRecord) {
      tailText.assertIsComposable(firstRecord.changeset);
    }

    this.records.tailText = tailText;
  }

  replaceTailTextAndSplice(
    tailText: Changeset,
    start: number,
    deleteCount: number,
    ...records: TRecord[]
  ) {
    if (tailText.hasRetainStrips()) {
      throw new Error(`Invalid tailText ${String(tailText)}`);
    }

    const firstRecord = this.records.at(start - 1) ?? records[0];
    if (firstRecord) {
      tailText.assertIsComposable(firstRecord.changeset);
    }

    this.splice(start, deleteCount, ...records);
    this.records.tailText = tailText;
  }

  splice(start: number, deleteCount: number, ...records: TRecord[]) {
    const leftRecord = this.records.at(start - 1);
    const firstInsertRecord = records[0];
    const lastInsertRecord = records[records.length - 1];
    const rightRecord = this.records.at(start + deleteCount);

    if (firstInsertRecord && leftRecord) {
      leftRecord.changeset.assertIsComposable(firstInsertRecord.changeset);
    }

    if (lastInsertRecord && rightRecord) {
      lastInsertRecord.changeset.assertIsComposable(rightRecord.changeset);
    }

    for (let i = 1; i < records.length; i++) {
      const r0 = records[i - 1];
      const r1 = records[i];
      if (r0 && r1) {
        r0.changeset.assertIsComposable(r1.changeset);
      }
    }

    this.records.splice(start, deleteCount, ...records);
  }

  clear(tailText: Changeset) {
    if (tailText.hasRetainStrips()) {
      throw new Error(`Invalid tailText ${String(tailText)}`);
    }

    this.records.tailText = tailText;
    this.records.clear();
  }
}
