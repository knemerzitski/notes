import { Changeset } from '../common/changeset';

import { $record } from './record';
import { $records } from './records';
import { HeadRecord, ServerRecord, ServerState, TailRecord } from './types';

/**
 *
 * @param initialRecords
 * @param tailRecordIndex default -1 which equals empty tail
 * @returns
 */
export function createStateFromRecords(
  initialRecords: Omit<ServerRecord, 'inverse'>[] = [],
  tailRecordIndex = -1
): ServerState {
  const tailStart = 0;
  const tailEnd = Math.max(0, Math.min(tailRecordIndex + 1, initialRecords.length));
  const calcStart = tailEnd;
  const calcEnd = initialRecords.length;

  const tailRecord: TailRecord = {
    revision:
      initialRecords[tailEnd - 1]?.revision ??
      (initialRecords[tailStart]?.revision ?? 1) - 1,
    text: initialRecords
      .slice(tailStart, tailEnd)
      .reduce((a, b) => Changeset.compose(a, b.changeset), Changeset.EMPTY),
  };

  let headRecord: HeadRecord = {
    ...tailRecord,
  };

  const records = initialRecords.slice(calcStart, calcEnd).map((record) => {
    const inverse = Changeset.inverse(record.changeset, headRecord.text);
    headRecord = {
      revision: record.revision,
      text: Changeset.compose(headRecord.text, record.changeset),
    };

    return {
      ...record,
      inverse,
    };
  });

  $record.assertTail(tailRecord);

  $records.assertTailToRecords(tailRecord, records);

  $records.assertRecordsToHead(records, headRecord);

  $records.assertIsComposable(records);

  return {
    tailRecord,
    records,
    headRecord,
  };
}
