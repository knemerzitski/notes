import { Changeset } from '../../../../collab/src';
import { getFragmentData, gql } from '../../__generated__';
import {
  MapRecordCollabTextRecordFragmentFragmentDoc,
  NotePendingStatus,
} from '../../__generated__/graphql';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { convertLocalToRemoteNote } from '../models/convert-local-to-remote-note';
import { isNoteHiddenInList } from '../models/local-note/hidden-in-list';
import { setNotePendingStatus } from '../models/local-note/set-status';
import { addUserToNote } from '../models/note/add-user';
import { addNoteToConnection } from '../models/note-connection/add';
import { addRecordToConnection } from '../models/record-connection/add';
import { getUserNoteLinkId, parseUserNoteLinkId } from '../utils/id';
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
          recordConnection(last: 1) {
            edges {
              node {
                ...MapRecord_CollabTextRecordFragment
              }
            }
            pageInfo {
              hasPreviousPage
            }
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

    // Add itself to list of users
    addUserToNote(
      data.userNoteLink.id,
      {
        id: data.userNoteLink.note.id,
      },
      cache
    );

    const { context } = options;
    const collabManager = context?.module?.note.collabManager;

    if (!collabManager) {
      throw new Error('Unexpected missing collabManager in context');
    }

    const firstRecord = getFragmentData(
      MapRecordCollabTextRecordFragmentFragmentDoc,
      data.firstCollabTextRecord
    );

    const { userId } = parseUserNoteLinkId(data.userNoteLink.id);

    const localNoteId = context.localNoteId;
    if (localNoteId) {
      convertLocalToRemoteNote(
        {
          userNoteLinkId: getUserNoteLinkId(localNoteId, userId),
        },
        {
          userNoteLinkId: data.userNoteLink.id,
        },
        {
          userId,
          cache,
          collabManager,
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

    if (context.isSubscriptionOperation) {
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

    if (options.context?.isSubscriptionOperation) {
      const headRecord = data.userNoteLink.note.collabText.headRecord;

      void collabManager.loadOrCreate(data.userNoteLink.id).then((facade) => {
        const service = facade.fieldCollab.service;

        service.reset({
          revision: headRecord.revision,
          text: Changeset.fromText(headRecord.text),
        });
      });
    } else {
      void collabManager.loadOrCreate(data.userNoteLink.id).then((facade) => {
        const service = facade.fieldCollab.service;

        service.submittedChangesAcknowledged(
          firstRecord
            ? cacheRecordToCollabServerRecord(firstRecord)
            : {
                // Server didn't return a record on note creation, assume revision increased and submittedChanges is acknowledged
                revision: service.serverRevision + 1,
                changeset: service.submittedChanges,
              }
        );
      });
    }
  }
);
