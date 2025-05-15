import { Logger } from '../../../utils/src/logging';

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

// TODO rename class to TransactionalRecords?
/**
 * Ensures that any records passing through this facade will be composable
 */
export class ComposableRecordsFacade<TRecord extends BaseComposableRecord> {
  private readonly logger;

  constructor(
    private readonly records: ComposableRecords<TRecord>,
    options?: {
      logger?: Logger;
    }
  ) {
    this.logger = options?.logger;

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

    this.logState('constructor');
  }

  private isTransactionInProgress = false;
  startTransaction() {
    if (this.isTransactionInProgress) {
      throw new Error('Transaction already in progress');
    }
    this.isTransactionInProgress = true;

    let isThisTransactionDone = false;

    this.logState('transaction');
    const savedState = {
      records: (() => {
        const ls = new Array<TRecord>(this.records.length);
        for (let i = 0; i < this.records.length; i++) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          ls[i] = this.records.at(i)!;
        }
        return ls;
      })(),
      tailText: this.records.tailText,
    };

    const disposeTransaction = () => {
      if (isThisTransactionDone) {
        return;
      }
      isThisTransactionDone = true;

      this.isTransactionInProgress = false;
    };

    const rollbackTransaction = () => {
      if (isThisTransactionDone) {
        return;
      }
      disposeTransaction();

      this.logState('transaction:rollback');
      this.records.splice(0, this.records.length, ...savedState.records);
      this.records.tailText = savedState.tailText;
      this.logState('transaction:rollback:completed');
    };

    return {
      completeTransaction: () => {
        if (isThisTransactionDone) {
          return;
        }

        try {
          if (this.records.tailText.hasRetainStrips()) {
            throw new Error(`Invalid tailText ${String(this.records.tailText)}`);
          }

          // Tail to first record
          const firstRecord = this.records.at(0);
          if (firstRecord) {
            this.records.tailText.assertIsComposable(firstRecord.changeset);
          }

          // First record up to last record
          for (let i = 1; i < this.records.length; i++) {
            const r0 = this.records.at(i - 1);
            const r1 = this.records.at(i);
            if (r0 && r1) {
              r0.changeset.assertIsComposable(r1.changeset);
            }
          }

          this.logState('transaction:completed');
          disposeTransaction();
        } catch (err) {
          this.logger?.error('transaction:error', err);
          rollbackTransaction();
          throw err;
        }
      },
      rollbackTransaction,
    };
  }

  push(record: TRecord) {
    this.records.push(record);
  }

  // TODO rename to deleteAfterAndPush
  /**
   * Delete records [deleteStartIndex, record.length - 1]
   * and then push the record
   */
  deleteFromThenPush(deleteStartIndex: number, record: TRecord) {
    if (deleteStartIndex <= 0) {
      this.records.clear();
      this.records.push(record);
    } else {
      this.records.splice(
        deleteStartIndex,
        this.records.length - deleteStartIndex,
        record
      );
    }
  }

  replaceTailText(tailText: Changeset) {
    this.records.tailText = tailText;
  }

  splice(start: number, deleteCount: number, ...records: TRecord[]) {
    this.records.splice(start, deleteCount, ...records);
  }

  clear(tailText: Changeset) {
    this.records.tailText = tailText;
    this.records.clear();
  }

  private logState(message: string, data?: Record<string, unknown>) {
    this.logger?.debug(message, {
      ...data,
      tailText: this.records.tailText.toString(),
      record: this.getRecordsForLogging(),
    });
  }

  private getRecordsForLogging() {
    const result: string[] = [];
    for (let i = 0; i < this.records.length; i++) {
      const record = this.records.at(i);
      if (record) {
        result.push(record.changeset.toString());
      }
    }
    return result;
  }
}
