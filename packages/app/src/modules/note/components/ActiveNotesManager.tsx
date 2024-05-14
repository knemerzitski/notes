import { useQuery } from '@apollo/client';
import { gql } from '../../../__generated__/gql';
import SubmittedRecordMutation from './SubmittedRecordMutation';
import ExternalChangesSubscription from './ExternalChangesSubscription';
import { Fragment } from 'react';
import NoteDeletedSubscription from './NoteDeletedSubscription';
import NoteContentIdToCollabTextsProvider from '../context/NoteContentIdToCollabTextsProvider';

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
            </Fragment>
          );
        })}
      </NoteContentIdToCollabTextsProvider>
    );
  });
}
