import useUpdateNote from '../hooks/useUpdateNote';
import { NoteTextField } from '../../../__generated__/graphql';
import { useEffect } from 'react';
import { SubmittedRecord } from '~collab/client/submitted-record';
import {
  collabTextRecordToEditorRevisionRecord,
  submittedRecordToCollabTextRecordInput,
} from '../../collab/editor-graphql-mapping';
import { useNoteContentId } from '../context/NoteContentIdProvider';
import { useNoteTextFieldEditor } from '../context/NoteTextFieldEditorsProvider';
import { gql } from '../../../__generated__/gql';
import { useApolloClient } from '@apollo/client';

const FRAGMENT_RECORDS = gql(`
  fragment SubmittedRecordMutationUpdateCache on CollabText {
    recordsConnection {
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
    }

  }
`);

export interface SubmittedRecordMutationProps {
  fieldName: NoteTextField;
}

/**
 * Listens for submittedRecord. Sends it to server and acknowleges the response.
 */
export default function SubmittedRecordMutation({
  fieldName,
}: SubmittedRecordMutationProps) {
  const apolloClient = useApolloClient();
  const updateNote = useUpdateNote();

  const noteContentId = useNoteContentId();
  const editor = useNoteTextFieldEditor(fieldName);

  useEffect(() => {
    async function handleSubmittedRecord(submittedRecord: SubmittedRecord) {
      const { data } = await updateNote({
        variables: {
          input: {
            contentId: noteContentId,
            patch: {
              textFields: [
                {
                  key: fieldName,
                  value: {
                    insertRecord: submittedRecordToCollabTextRecordInput(submittedRecord),
                  },
                },
              ],
            },
          },
        },
      });

      const textField = data?.updateNote.patch?.textFields?.find(
        (textField) => textField.key === fieldName
      );
      const newRecord = textField?.value.newRecord;
      if (!newRecord) return;

      // Update cache with new record
      apolloClient.cache.writeFragment({
        id: apolloClient.cache.identify({
          id: textField.value.id,
          __typename: 'CollabText',
        }),
        fragment: FRAGMENT_RECORDS,
        data: {
          recordsConnection: {
            records: [newRecord],
          },
        },
      });

      const editorRecord = collabTextRecordToEditorRevisionRecord(newRecord);
      editor.submittedChangesAcknowledged(editorRecord);
    }

    const existingSubmittedRecord = editor.submittedRecord;
    if (existingSubmittedRecord) {
      void handleSubmittedRecord(existingSubmittedRecord);
    }

    return editor.eventBus.on('submittedRecord', ({ submittedRecord }) => {
      void handleSubmittedRecord(submittedRecord);
    });
  }, [editor, noteContentId, fieldName, updateNote, apolloClient]);

  return null;
}
