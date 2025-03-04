import { Changeset } from '../../../../collab/src/changeset';
import { CollabServiceRecord } from '../../../../collab/src/client/collab-service';
import { SubmittedRecord } from '../../../../collab/src/client/submitted-record';

import { gql } from '../../__generated__';
import {
  CollabTextRecordInput,
  MapRecordCollabTextRecordFragmentFragment,
  RevisionChangeset,
} from '../../__generated__/graphql';

/**
 * Record structure that is always fetched from the server and stored in cache.
 */
const _MapRecord_CollabTextRecordFragment = gql(`
  fragment MapRecord_CollabTextRecordFragment on CollabTextRecord {
    id
    creatorUser {
      id
    }
    change {
      revision
      changeset
    }
    beforeSelection {
      start
      end
    }
    afterSelection {
      start
      end
    }
  }
`);

/**
 * Map SubmittedRecord from CollabService to appropriate
 * record for server consumption.
 */
export function submittedRecordToCollabTextRecordInput(
  record: SubmittedRecord
): CollabTextRecordInput {
  return {
    generatedId: record.userGeneratedId,
    change: {
      revision: record.revision,
      changeset: record.changeset,
    },
    afterSelection: record.afterSelection,
    beforeSelection: record.beforeSelection,
  };
}

/**
 * Map record received from server (that is stored in ApolloCache)
 * to appropriate record for CollabService consumption.
 */
export function cacheRecordToCollabServiceRecord(
  record: MapRecordCollabTextRecordFragmentFragment
): CollabServiceRecord {
  return {
    creatorUserId: record.creatorUser.id,
    revision: record.change.revision,
    changeset: record.change.changeset,
    afterSelection: {
      start: record.afterSelection.start,
      end: record.afterSelection.end ?? record.afterSelection.start,
    },
    beforeSelection: {
      start: record.beforeSelection.start,
      end: record.beforeSelection.end ?? record.beforeSelection.start,
    },
  };
}

export function firstRevisionChangeset(): RevisionChangeset {
  return {
    __typename: 'RevisionChangeset',
    changeset: Changeset.EMPTY,
    revision: 0,
  };
}
