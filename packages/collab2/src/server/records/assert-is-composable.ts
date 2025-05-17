import { ServerError } from '../errors';
import { $record } from '../record';
import { ServerRecord } from '../types';

type R = Pick<ServerRecord, 'changeset' | 'revision'>;

export function assertIsComposable(records: readonly R[]) {
  for (let i = 1; i < records.length; i++) {
    const prevRecord = records[i - 1];
    const record = records[i];
    if (!prevRecord || !record) {
      continue;
    }

    try {
      $record.assertIsComposable(prevRecord, record);
    } catch (err) {
      throw new ServerError(`Records at index "${i - 1}" and "${i}" are not composable`, {
        cause: err,
      });
    }
  }
}
