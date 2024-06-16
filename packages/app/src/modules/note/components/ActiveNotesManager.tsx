import { useQuery } from '@apollo/client';
import { Fragment } from 'react';

import { gql } from '../../../__generated__/gql';
import NoteContentIdToCollabTextsProvider from '../context/NoteContentIdToCollabTextsProvider';

import ExternalChangesSubscription from './ExternalChangesSubscription';
import NoteDeletedSubscription from './NoteDeletedSubscription';
import SubmittedRecordMutation from './SubmittedRecordMutation';
import SyncRecordsHeadTextUpdated from './SyncRecordsHeadTextUpdated';
import SyncRecordsMissingInBuffer from './SyncRecordsMissingInBuffer';

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

export default function ActiveNotesManager() {
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
            <ExternalChangesSubscription />
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
