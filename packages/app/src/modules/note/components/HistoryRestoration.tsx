import { useEffect, useRef } from 'react';
import { gql } from '../../../__generated__';
import { NoteTextField } from '../../../__generated__/graphql';
import { useNoteContentId } from '../context/NoteContentIdProvider';
import { useNoteTextFieldEditor } from '../context/NoteTextFieldEditorsProvider';
import { useApolloClient } from '@apollo/client';
import isDefined from '~utils/type-guards/isDefined';
import { collabTextRecordToEditorRevisionRecord } from '../../collab/editor-graphql-adapter';
import { RevisionChangeset } from '~collab/records/record';

const QUERY = gql(`
  query HistoryRestoration($noteContentId: String!, $fieldName: NoteTextField!, 
                            $recordsBeforeRevision: NonNegativeInt!, $recordsLast: PositiveInt!, 
                            $tailRevision: NonNegativeInt!){
    note(contentId: $noteContentId) {
      id
      textFields(name: $fieldName) {
        key
        value {
          id
          textAtRevision(revision: $tailRevision) {
            revision
            changeset
          }
          recordsConnection(before: $recordsBeforeRevision, last: $recordsLast){
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
              startCursor
            }
          }
        }
      }
    }
  }

`);

export interface HistoryRestorationProps {
  fieldName: NoteTextField;
  /**
   * Amount of entries to fetch in one go.
   * @default 10
   */
  fetchEntriesCount?: number;
  /**
   * Fetch more entries when n-amount of entries are left in history that can be undo.
   * @default 20
   */
  triggerEntriesRemaining?: number;
}

export default function HistoryRestoration({
  fieldName,
  triggerEntriesRemaining = 10,
  fetchEntriesCount = 20,
}: HistoryRestorationProps) {
  const apolloClient = useApolloClient();
  const noteContentId = useNoteContentId();
  const editor = useNoteTextFieldEditor(fieldName);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (editor.serverHasOlderRecords === false) return;

    const appliedUndoHandler = () => {
      void attemptFetchMore();
    };

    async function attemptFetchMore() {
      if (isFetchingRef.current || editor.serverHasOlderRecords === false) return;

      const entriesRemaining = editor.history.localIndex + 1;
      if (entriesRemaining <= triggerEntriesRemaining) {
        try {
          isFetchingRef.current = true;
          const tailRevision = Math.max(0, editor.tailRevision - fetchEntriesCount);
          const result = await apolloClient.query({
            query: QUERY,
            variables: {
              fieldName,
              noteContentId,
              recordsBeforeRevision: editor.tailRevision + 1,
              recordsLast: fetchEntriesCount,
              tailRevision,
            },
          });

          result.data.note.textFields.forEach((textField) => {
            if (textField.key !== fieldName) return;
            const recordsConnection = textField.value.recordsConnection;

            editor.serverHasOlderRecords = recordsConnection.pageInfo.hasPreviousPage;
            if (!editor.serverHasOlderRecords) {
              // Stop listening since no more records
              editor.eventBus.off('appliedUndo', appliedUndoHandler);
            }

            editor.addServerRecords(
              recordsConnection.records
                .filter(isDefined)
                .map(collabTextRecordToEditorRevisionRecord),
              RevisionChangeset.parseValue(textField.value.textAtRevision)
            );
          });

          void attemptFetchMore();
        } finally {
          isFetchingRef.current = false;
        }
      }
    }

    void attemptFetchMore();
    return editor.eventBus.on('appliedUndo', appliedUndoHandler);
  }, [
    editor,
    noteContentId,
    fieldName,
    apolloClient,
    fetchEntriesCount,
    triggerEntriesRemaining,
  ]);

  return null;
}
