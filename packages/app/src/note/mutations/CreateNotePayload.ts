import { getFragmentData, gql } from '../../__generated__';
import {
  MapRecordCollabTextRecordFragmentFragmentDoc,
  NotePendingStatus,
} from '../../__generated__/graphql';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { convertLocalToRemoteNote } from '../models/convert-local-to-remote-note';
import { isNoteHiddenInList } from '../models/local-note/hidden-in-list';
import { setNotePendingStatus } from '../models/local-note/set-status';
import { getCollabService } from '../models/note/get-collab-service';
import { addNoteToConnection } from '../models/note-connection/add';
import { addRecordToConnection } from '../models/record-connection/add';
import { parseUserNoteLinkId } from '../utils/id';
import { Changeset } from '../../../../collab2/src';
import { cacheRecordToCollabServerRecord } from '../utils/map-record';

/**
 * Will acknowledge submitted changes in service
 */
export const CreateNotePayload = mutationDefinition(
  gql(`
  fragment CreateNotePayload on CreateNotePayload {
    firstCollabTextRecord {
      ...MapRecord_CollabTextRecordFragment
    }
    userNoteLink {
      id
      categoryName
      note {
        id
        collabText {
          id
          headRecord {
            revision
            text
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
      MapRecordCollabTextRecordFragmentFragmentDoc,
      data.firstCollabTextRecord
    );

    const { userId } = parseUserNoteLinkId(data.userNoteLink.id);

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
        isNoteHiddenInList({ id: data.userNoteLink.id }, cache)
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

    if (firstRecord) {
      addRecordToConnection(data.userNoteLink.note.collabText.id, firstRecord, cache);
    }

    const service = getCollabService(
      { id: userId },
      { id: data.userNoteLink.note.id },
      cache
    );

    if (options.context?.isSubscriptionOperation) {
      const headRecord = data.userNoteLink.note.collabText.headRecord;
      service.reset({
        revision: headRecord.revision,
        text: Changeset.fromText(headRecord.text),
      });
    } else {
      if (firstRecord) {
        service.submittedChangesAcknowledged(
          cacheRecordToCollabServerRecord(firstRecord)
        );
      }
    }
  }
);
