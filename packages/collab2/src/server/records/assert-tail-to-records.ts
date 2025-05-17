import { $record } from '../record';
import { ServerRecord, TailRecord } from '../types';

/**
 * records [Rk , ... , Rn] \
 * tail T
 *
 * Must be composable T * R0 * ...
 *
 * Asserts that records are composable, have correct revisions
 * and tailRecord is composable on first record
 */
export function assertTailToRecords(
  tailRecord: TailRecord,
  records: readonly Pick<ServerRecord, 'revision' | 'changeset'>[]
) {
  const firstRecord = records[0];
  if (firstRecord) {
    $record.assertIsComposable(
      {
        revision: tailRecord.revision,
        changeset: tailRecord.text,
      },
      firstRecord
    );
  }
}
