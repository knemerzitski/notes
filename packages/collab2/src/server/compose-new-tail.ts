import { Changeset } from '../common/changeset';
import { $record } from './record';
import { $records } from './records';
import { ServerRecord, TailRecord } from './types';

export function composeNewTail(
  tailRecord: TailRecord,
  records: readonly ServerRecord[],
  /**
   * End of records slice to compose
   * @default records.length
   */
  end: number = records.length
): TailRecord {
  end = Math.min(end, records.length);

  const lastRecord = records[end - 1];
  if (!lastRecord) {
    return tailRecord;
  }

  $record.assertTail(tailRecord);

  $records.assertTailToRecords(tailRecord, records);

  $records.assertIsComposable(records);

  return {
    revision: lastRecord.revision,
    text: records
      .slice(0, end)
      .reduce(
        (leftChangeset, right) => Changeset.compose(leftChangeset, right.changeset),
        tailRecord.text
      ),
  };
}
