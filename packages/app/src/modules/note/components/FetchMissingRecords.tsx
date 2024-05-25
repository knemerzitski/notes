import { useEffect } from 'react';
import { gql } from '../../../__generated__/gql';
import { useApolloClient } from '@apollo/client';
import { useNoteContentId } from '../context/NoteContentIdProvider';
import { NoteTextField } from '../../../__generated__/graphql';
import { useNoteTextFieldEditor } from '../context/NoteTextFieldEditorsProvider';
import { RevisionChangeset } from '~collab/records/record';
import { collabTextRecordToEditorRevisionRecord } from '../../collab/editor-graphql-adapter';

const QUERY_WATCH = gql(`
  query FetchMissingRecordsWatch($noteContentId: String!, $fieldName: NoteTextField!){
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
  query FetchMissingRecords($noteContentId: String!, $fieldName: NoteTextField!, 
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
export default function FetchMissingRecords({ fieldName }: FetchMissingRecordsProps) {
  const apolloClient = useApolloClient();

  const noteContentId = useNoteContentId();
  const editor = useNoteTextFieldEditor(fieldName);

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
          console.log(
            'found outdated editor',
            editor.headRevision,
            textField.headText.revision
          );
          if (!editor.haveChanges()) {
            console.log('replaceHeadText');
            // No changes, just replace headText
            editor.replaceHeadText(RevisionChangeset.parseValue(textField.headText));
          } else {
            console.log('query records', {
              after: editor.headRevision,
              first: textField.headText.revision - editor.headRevision,
            });
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
                data.note.textFields?.forEach(({ key, value }) => {
                  if (key !== fieldName) return;
                  value.recordsConnection.records.forEach((record) => {
                    if (!record) return;
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
