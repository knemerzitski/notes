import {
  CollabServiceSubmittedServiceRecord,
  ServerRecord,
} from '../../../../collab2/src';
import { gql } from '../../__generated__';
import {
  CollabTextRecordInput,
  MapRecordCollabTextRecordFragmentFragment,
} from '../../__generated__/graphql';

/**
 * Record structure that is always fetched from the server and stored in cache.
 */
const _MapRecord_CollabTextRecordFragment = gql(`
  fragment MapRecord_CollabTextRecordFragment on CollabTextRecord {
    id
    author {
      id
    }
    revision
    changeset
    inverse
    selectionInverse
    selection
  }
`);

/**
 * Map SubmittedRecord from CollabService to appropriate
 * record for server consumption.
 */
export function submittedRecordToCollabTextRecordInput(
  record: CollabServiceSubmittedServiceRecord
): CollabTextRecordInput {
  return {
    id: record.id,
    targetRevision: record.targetRevision,
    changeset: record.changeset,
    selectionInverse: record.selectionInverse,
    selection: record.selection,
  };
}

export function cacheRecordToCollabServerRecord(
  record: MapRecordCollabTextRecordFragmentFragment
): Pick<
  ServerRecord,
  'authorId' | 'revision' | 'changeset' | 'inverse' | 'selectionInverse' | 'selection'
> {
  return {
    authorId: record.author.id,
    revision: record.revision,
    changeset: record.changeset,
    inverse: record.inverse,
    selectionInverse: record.selectionInverse,
    selection: record.selection,
  };
}
