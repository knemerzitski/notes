import { ServerError } from '../errors';
import { HeadRecord } from '../types';

export function assertHead(headRecord: HeadRecord) {
  if (!headRecord.text.isText()) {
    throw new ServerError(
      `Unexpected headRecord is not text: ${headRecord.text.toString()}`
    );
  }
}
