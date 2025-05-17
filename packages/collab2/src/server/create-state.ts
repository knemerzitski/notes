import { Changeset } from '../common/changeset';
import { Selection } from '../common/selection';

import { $record } from './record';
import { $records } from './records';
import { HeadRecord, ServerRecord, ServerState, TailRecord } from './types';

export function createState(
  initialRecords: Omit<ServerRecord, 'inverse'>[] = []
): ServerState {
  const firstRecord = initialRecords[0] ?? {
    authorId: '',
    idempotencyId: '',
    revision: 1,
    changeset: Changeset.EMPTY,
    inverse: Changeset.EMPTY,
    selectionInverse: Selection.ZERO,
    selection: Selection.ZERO,
  };

  const tailRecord: TailRecord = {
    revision: firstRecord.revision - 1,
    text: Changeset.EMPTY,
  };

  let headRecord: HeadRecord = {
    ...tailRecord,
  };

  const records = initialRecords.map((record) => {
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
