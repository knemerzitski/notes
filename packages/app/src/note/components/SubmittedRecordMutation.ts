import { useQuery } from '@apollo/client';
import { useEffect, useRef } from 'react';

import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';
import { useUpdateNoteInsertRecord } from '../hooks/useUpdateNoteInsertRecord';

// TODO fragment for for loader

const SubmittedRecordMutation_Query = gql(`
  query SubmittedRecordMutation_Query($id: ObjectID!) {
    userNoteLink(by: { noteId: $id }) @client {
      id
      note {
        id
        collabService
      }
    }
  }
`);

/**
 * Watches CollabService.submittedRecord and submits it to the server
 */
export function SubmittedRecordMutation() {
  const insertRecord = useUpdateNoteInsertRecord();
  const submittingRef = useRef(false);

  const noteId = useNoteId();
  const { data } = useQuery(SubmittedRecordMutation_Query, {
    variables: {
      id: noteId,
    },
  });

  const maybeService = data?.userNoteLink.note.collabService;

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
