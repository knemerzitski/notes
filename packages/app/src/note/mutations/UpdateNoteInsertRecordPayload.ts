import { getFragmentData, gql } from '../../__generated__';
import { MapRecordCollabTextRecordFragmentFragmentDoc } from '../../__generated__/graphql';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { getCurrentUserId } from '../../user/models/signed-in-user/get-current';
import { getCollabService } from '../models/note/get-collab-service';
import { updateOpenNoteSelectionRange } from '../models/opened-note/update-selection';
import { addRecordToConnection } from '../models/record-connection/add';
import { findVariablesAuthUserId } from '../utils/find-variables-auth-user-id';
import { getUserNoteLinkId } from '../utils/id';
import { cacheRecordToCollabServerRecord } from '../utils/map-record';

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
  (cache, { data }, { context, variables }) => {
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

    if (context?.isSubscriptionOperation) {
      const userId = getCurrentUserId(cache);
      const service = getCollabService({ id: userId }, { id: note.id }, cache);
      service.addExternalTyping(cacheRecordToCollabServerRecord(newRecord));
    } else {
      const userId = findVariablesAuthUserId(variables) ?? getCurrentUserId(cache);
      const service = getCollabService({ id: userId }, { id: note.id }, cache);
      service.submittedChangesAcknowledged(cacheRecordToCollabServerRecord(newRecord));
    }

    // Update open note selection from record
    updateOpenNoteSelectionRange(
      getUserNoteLinkId(note.id, newRecord.author.id),
      {
        revision: newRecord.revision,
        selection: newRecord.selection,
      },
      cache
    );
  }
);
