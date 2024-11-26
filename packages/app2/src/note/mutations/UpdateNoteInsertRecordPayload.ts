import { getFragmentData, gql } from '../../__generated__';
import { AddRecordToConnectionCollabTextRecordFragmentFragmentDoc } from '../../__generated__/graphql';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { getCollabService } from '../models/note/get-collab-service';
import { addRecordToConnection } from '../models/record-connection/add';
import { collabTextRecordToCollabServiceRecord } from '../utils/map-record';

export const UpdateNoteInsertRecordPayload = mutationDefinition(
  gql(`
    fragment UpdateNoteInsertRecordPayload on UpdateNoteInsertRecordPayload {
      newRecord {
        ...AddRecordToConnection_CollabTextRecordFragment
      }
      collabText {
        id
      }
      note {
        id
      }
    }
  `),
  (cache, { data }, { context }) => {
    if (!data) {
      return;
    }

    const { newRecord: newRecordFragment, note, collabText } = data;

    const newRecord = getFragmentData(
      AddRecordToConnectionCollabTextRecordFragmentFragmentDoc,
      newRecordFragment
    );

    // Add record to recordConnection
    addRecordToConnection(collabText.id, newRecord, cache);

    const service = getCollabService({ noteId: note.id }, cache);

    if (context?.isSubscriptionOperation) {
      service.handleExternalChange(collabTextRecordToCollabServiceRecord(newRecord));
    } else {
      service.submittedChangesAcknowledged(
        collabTextRecordToCollabServiceRecord(newRecord)
      );
    }
  }
);
