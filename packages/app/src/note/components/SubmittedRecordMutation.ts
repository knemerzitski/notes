import { useEffect, useRef } from 'react';

import { useNoteId } from '../context/note-id';
import { useCollabService } from '../hooks/useCollabService';
import { useUpdateNoteInsertRecord } from '../hooks/useUpdateNoteInsertRecord';

/**
 * Watches CollabService for submittedChanges and submits it to the server
 */
export function SubmittedRecordMutation() {
  const insertRecord = useUpdateNoteInsertRecord();
  const submittingRef = useRef(false);

  const noteId = useNoteId();
  const maybeService = useCollabService(true);

  useEffect(() => {
    if (!maybeService) {
      return;
    }
    const service = maybeService;

    function update() {
      if (submittingRef.current) {
        return;
      }

      const submittedRecord = service.submitChanges();
      if (!submittedRecord) {
        return;
      }

      submittingRef.current = true;
      void insertRecord(noteId, submittedRecord).finally(() => {
        submittingRef.current = false;
      });
    }

    update();

    const eventBusOff = service.on('submittedChanges:have', () => {
      update();
    });

    return () => {
      eventBusOff();
      update();
    };
  }, [maybeService, noteId, insertRecord]);

  return null;
}
