import { Changeset } from '../../common/changeset';
import { HeadRecord, ServerRecord } from '../types';

export function composeHeadRecord(
  newServerRecord: ServerRecord,
  headRecord: HeadRecord
): HeadRecord {
  return {
    revision: newServerRecord.revision,
    text: Changeset.compose(headRecord.text, newServerRecord.changeset),
  };
}
