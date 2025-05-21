import { getFragmentData, gql } from '../../__generated__';
import { MapRecordCollabTextRecordFragmentFragmentDoc } from '../../__generated__/graphql';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { getCurrentUserId } from '../../user/models/signed-in-user/get-current';
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

    const collabManager = context?.module?.note.collabManager;
    if (!collabManager) {
      throw new Error('Unexpected missing collabManager in context');
    }

    const { newRecord: newRecordFragment, note, collabText } = data;

    const newRecord = getFragmentData(
      MapRecordCollabTextRecordFragmentFragmentDoc,
      newRecordFragment
    );

    // Add record to recordConnection
    addRecordToConnection(collabText.id, newRecord, cache);

    if (context.isSubscriptionOperation) {
      const userId = getCurrentUserId(cache);
      const userNoteLinkId = getUserNoteLinkId(note.id, userId);

      void collabManager.loadIfExists(userNoteLinkId).then((facade) => {
        if (!facade) {
          return;
        }

        const service = facade.fieldCollab.service;
        service.addExternalTyping(cacheRecordToCollabServerRecord(newRecord));
      });
    } else {
      const userId = findVariablesAuthUserId(variables) ?? getCurrentUserId(cache);
      const userNoteLinkId = getUserNoteLinkId(note.id, userId);

      void collabManager.loadIfExists(userNoteLinkId).then((facade) => {
        if (!facade) {
          return;
        }

        const service = facade.fieldCollab.service;
        service.submittedChangesAcknowledged(cacheRecordToCollabServerRecord(newRecord));
      });
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
