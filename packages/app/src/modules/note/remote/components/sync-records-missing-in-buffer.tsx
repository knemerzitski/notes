import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';

import { gql } from '../../../../__generated__/gql';
import { NoteTextField } from '../../../../__generated__/graphql';
import { collabTextRecordToEditorRevisionRecord } from '../../../collab/editor-graphql-mapping';
import { useNoteContentId } from '../context/note-content-id-provider';
import { useNoteTextFieldEditor } from '../context/note-text-field-editors-provider';

const QUERY_RECORDS = gql(`
  query SyncRecordsMissingInBuffer($noteContentId: String!, $fieldName: NoteTextField!, 
                            $after: NonNegativeInt!, $first: PositiveInt!){
    note(contentId: $noteContentId) {
      id
      textFields(name: $fieldName) {
        key
        value {
          id
          recordsConnection(after: $after, first: $first){
            records {
              id
              creatorUserId
              change {
                revision
                changeset
              }
              beforeSelection {
                start
                end
              }
              afterSelection {
                start
                end
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
`);

export interface FetchMissingRecordsProps {
  fieldName: NoteTextField;
  /**
   * Delay in millis to wait before fetch missing records.
   * @default 200
   */
  fetchDelay?: number;
}

export function SyncRecordsMissingInBuffer({
  fieldName,
  fetchDelay = 200,
}: FetchMissingRecordsProps) {
  const apolloClient = useApolloClient();

  const noteContentId = useNoteContentId();
  const editor = useNoteTextFieldEditor(fieldName);

  // If records buffer has missing records, fetch them after a delay
  useEffect(() => {
    let fetching = false;
    async function fetchMissingRecords(depth = 0) {
      if (depth > 20) {
        throw new Error(
          'Attempted to fetch missing records 20 times recursively. Stopping!'
        );
      }

      if (fetching) return;

      try {
        fetching = true;

        const initialMissingRevisions = editor.getMissingRevisions();
        if (!initialMissingRevisions) return;

        if (fetchDelay > 0) {
          await new Promise((res) => {
            setTimeout(res, fetchDelay);
          });
        }

        const missingRevisions = editor.getMissingRevisions();
        if (!missingRevisions) return;

        const { start, end } = missingRevisions;

        await apolloClient
          .query({
            query: QUERY_RECORDS,
            variables: {
              fieldName,
              noteContentId,
              after: start - 1,
              first: end - start + 1,
            },
          })
          .then(({ data }) => {
            data.note.textFields.forEach(({ key, value }) => {
              if (key !== fieldName) return;
              value.recordsConnection.records.forEach((record) => {
                editor.handleExternalChange(
                  collabTextRecordToEditorRevisionRecord(record)
                );
              });
            });
          });
      } finally {
        fetching = false;
      }

      void fetchMissingRecords(depth + 1);
    }

    const missingRevisions = editor.getMissingRevisions();
    if (missingRevisions) {
      void fetchMissingRecords();
    }

    return editor.eventBus.on('missingRevisions', () => {
      void fetchMissingRecords();
    });
  }, [apolloClient, noteContentId, fieldName, editor, fetchDelay]);

  return null;
}
