import { getFragmentData, gql } from '../../__generated__';
import {
  AddRecordToConnectionCollabTextRecordFragmentFragmentDoc,
  NotePendingStatus,
} from '../../__generated__/graphql';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { collabTextRecordToCollabServiceRecord } from '../utils/map-record';
import { getCollabService } from '../models/note/get-collab-service';
import { addNoteToConnection } from '../models/note-connection/add';
import { addRecordToConnection } from '../models/record-connection/add';
import { setNotePendingStatus } from '../models/local-note/set-status';
import { getOperationUserId } from '../../graphql/utils/get-operation-user-id';
import { convertLocalToRemoteNote } from '../models/convert-local-to-remote-note';
import { isExcludeNoteFromConnection } from '../models/local-note/is-exclude';

/**
 * Will acknowledge submitted changes in service
 */
export const CreateNotePayload = mutationDefinition(
  gql(`
  fragment CreateNotePayload on CreateNotePayload {
    firstCollabTextRecord {
      ...AddRecordToConnection_CollabTextRecordFragment
    }
    userNoteLink {
      id
      categoryName
      note {
        id
        collabText {
          id
          headText {
            revision
            changeset
          }
        }
      }
    }
  }
`),
  (cache, { data }, options) => {
    if (!data) {
      return;
    }

    const { context } = options;

    const firstRecord = getFragmentData(
      AddRecordToConnectionCollabTextRecordFragmentFragmentDoc,
      data.firstCollabTextRecord
    );
    if (!firstRecord) {
      throw new Error('Create note unexpected missing first collab record');
    }

    const userId = getOperationUserId(options);

    const localNoteId = context?.localNoteId;
    if (localNoteId) {
      convertLocalToRemoteNote(
        {
          noteId: localNoteId,
        },
        {
          userNoteLinkId: data.userNoteLink.id,
        },
        {
          userId,
          cache,
        }
      );

      setNotePendingStatus({ noteId: localNoteId }, NotePendingStatus.CONVERTING, cache);

      setNotePendingStatus(
        { id: data.userNoteLink.id },
        isExcludeNoteFromConnection({ id: data.userNoteLink.id }, cache)
          ? NotePendingStatus.DONE
          : null,
        cache
      );
    }

    if (context?.isSubscriptionOperation) {
      addNoteToConnection(
        {
          id: data.userNoteLink.id,
        },
        cache
      );
    }

    addRecordToConnection(data.userNoteLink.note.collabText.id, firstRecord, cache);

    const service = getCollabService({ userNoteLinkId: data.userNoteLink.id }, cache);
    service.submittedChangesAcknowledged(
      collabTextRecordToCollabServiceRecord(firstRecord)
    );
  }
);
