import { HeadRecord } from '../types';

export function assertHead(headRecord: HeadRecord) {
  if (!headRecord.text.isText()) {
    throw new Error(`Unexpected headRecord is not text: ${headRecord.text.toString()}`);
  }
}
