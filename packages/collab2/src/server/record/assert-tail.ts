import { TailRecord } from '../types';

export function assertTail(tailRecord: TailRecord) {
  if (!tailRecord.text.isText()) {
    throw new Error(`Unexpected tailRecord is not text: ${tailRecord.text.toString()}`);
  }
}
