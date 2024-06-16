import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';
import { RevisionChangeset } from '~collab/records/record';

import { gql } from '../../../__generated__/gql';
import { NoteTextField } from '../../../__generated__/graphql';
import { collabTextRecordToEditorRevisionRecord } from '../../collab/editor-graphql-mapping';
import { useNoteContentId } from '../context/NoteContentIdProvider';
import { useNoteTextFieldEditor } from '../context/NoteTextFieldEditorsProvider';

const QUERY_WATCH = gql(`
  query SyncRecordsHeadTextUpdatedWatch($noteContentId: String!, $fieldName: NoteTextField!){
    note(contentId: $noteContentId) @client {
      id
      textFields(name: $fieldName) {
        key
        value {
          id
          headText {
            revision
            changeset
          }
        }
      }
    }
  }
`);

const QUERY_RECORDS = gql(`
  query SyncRecordsHeadTextUpdated($noteContentId: String!, $fieldName: NoteTextField!, 
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
}

/**
 *
 * If persisted note textField editor is is older than
 * recently fetched headText then update editor.
 */
export default function SyncRecordsHeadTextUpdated({
  fieldName,
}: FetchMissingRecordsProps) {
  const apolloClient = useApolloClient();

  const noteContentId = useNoteContentId();
  const editor = useNoteTextFieldEditor(fieldName);

  // If cache updates with a headText.revision higher than editor, the must update editor
  useEffect(() => {
    const observable = apolloClient.watchQuery({
      query: QUERY_WATCH,
      variables: {
        noteContentId,
        fieldName,
      },
      fetchPolicy: 'cache-only',
    });

    const sub = observable.subscribe({
      next(value) {
        if (value.partial) return;
        const textField = value.data.note.textFields.find(
          (textField) => textField.key === fieldName
        )?.value;
        if (!textField) return;
        const editorIsOutdated = editor.headRevision < textField.headText.revision;
        if (editorIsOutdated) {
          if (!editor.haveChanges()) {
            // No changes, just replace headText
            editor.replaceHeadText(RevisionChangeset.parseValue(textField.headText));
          } else {
            // Have local/submitted changes, query for records and handle them as external changes
            void apolloClient
              .query({
                query: QUERY_RECORDS,
                variables: {
                  fieldName,
                  noteContentId,
                  after: editor.headRevision,
                  first: textField.headText.revision - editor.headRevision,
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
          }
        }
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [apolloClient, noteContentId, fieldName, editor]);

  return null;
}
