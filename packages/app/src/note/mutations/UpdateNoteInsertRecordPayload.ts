import { getFragmentData, gql } from '../../__generated__';
import { MapRecordCollabTextRecordFragmentFragmentDoc } from '../../__generated__/graphql';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { getCollabService } from '../models/note/get-collab-service';
import { updateOpenNoteSelectionRange } from '../models/opened-note/update-selection';
import { addRecordToConnection } from '../models/record-connection/add';
import { getUserNoteLinkId } from '../utils/id';
import { cacheRecordToCollabServiceRecord } from '../utils/map-record';

export const UpdateNoteInsertRecordPayload = mutationDefinition(
  gql(`
    fragment UpdateNoteInsertRecordPayload on UpdateNoteInsertRecordPayload {
      newRecord {
        ...MapRecord_CollabTextRecordFragment
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
      MapRecordCollabTextRecordFragmentFragmentDoc,
      newRecordFragment
    );

    // Add record to recordConnection
    addRecordToConnection(collabText.id, newRecord, cache);

    const service = getCollabService({ id: note.id }, cache);

    if (context?.isSubscriptionOperation) {
      service.handleExternalChange(cacheRecordToCollabServiceRecord(newRecord));
    } else {
      service.submittedChangesAcknowledged(cacheRecordToCollabServiceRecord(newRecord));
    }

    // Update open note selection from record
    updateOpenNoteSelectionRange(
      getUserNoteLinkId(note.id, newRecord.creatorUser.id),
      {
        revision: newRecord.change.revision,
        selectionRange: newRecord.afterSelection,
      },
      cache
    );
  }
);
