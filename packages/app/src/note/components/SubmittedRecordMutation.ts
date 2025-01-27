import { useEffect, useRef } from 'react';

import { useNoteId } from '../context/note-id';
import { useUpdateNoteInsertRecord } from '../hooks/useUpdateNoteInsertRecord';
import { useCollabService } from '../hooks/useCollabService';

/**
 * Watches CollabService.submittedRecord and submits it to the server
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

      const submittedRecord = service.submittedRecord;
      if (!submittedRecord) {
        return;
      }

      submittingRef.current = true;
      void insertRecord(noteId, submittedRecord).finally(() => {
        submittingRef.current = false;
      });
    }

    update();

    const eventBusOff = service.eventBus.on('submittedRecord', () => {
      update();
    });

    return () => {
      eventBusOff();
      update();
    };
  }, [maybeService, noteId, insertRecord]);

  return null;
}
