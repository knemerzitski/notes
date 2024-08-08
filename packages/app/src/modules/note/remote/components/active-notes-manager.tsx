import { useQuery } from '@apollo/client';
import { Fragment } from 'react';

import { gql } from '../../../../__generated__/gql';
import { NoteContentIdToCollabTextsProvider } from '../context/note-content-id-to-collab-texts-provider';

import { NoteDeletedSubscription } from './note-deleted-subscription';
import { NoteUpdatedSubscription } from './note-updated-subscription';
import { SubmittedRecordMutation } from './submitted-record-mutation';
import { SyncRecordsHeadTextUpdated } from './sync-records-head-text-updated';
import { SyncRecordsMissingInBuffer } from './sync-records-missing-in-buffer';

const QUERY = gql(`
  query ActiveNotesManager {
    allActiveNotes @client {
      id
      contentId
      isOwner
      textFields {
        key
        value {
          id
        }
      }
    }
  }
`);

export function ActiveNotesManager() {
  const { data } = useQuery(QUERY, {
    fetchPolicy: 'cache-only',
  });

  if (!data) return null;

  const activeNotes = data.allActiveNotes;

  return activeNotes.map((activeNote) => {
    const noteContentId = activeNote.contentId;

    return (
      <NoteContentIdToCollabTextsProvider
        key={noteContentId}
        noteContentId={noteContentId}
        fetchPolicy="cache-only"
      >
        {!activeNote.isOwner && (
          <>
            <NoteUpdatedSubscription />
            <NoteDeletedSubscription />
          </>
        )}

        {activeNote.textFields.map((textField) => {
          const fieldName = textField.key;
          const collabTextId = String(textField.value.id);

          return (
            <Fragment key={collabTextId}>
              <SubmittedRecordMutation fieldName={fieldName} />
              <SyncRecordsHeadTextUpdated fieldName={fieldName} />
              <SyncRecordsMissingInBuffer fieldName={fieldName} />
            </Fragment>
          );
        })}
      </NoteContentIdToCollabTextsProvider>
    );
  });
}
