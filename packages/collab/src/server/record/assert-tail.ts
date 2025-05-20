import { ServerError } from '../errors';
import { TailRecord } from '../types';

export function assertTail(tailRecord: TailRecord) {
  if (!tailRecord.text.isText()) {
    throw new ServerError(
      `Unexpected tailRecord is not text: ${tailRecord.text.toString()}`
    );
  }
}
