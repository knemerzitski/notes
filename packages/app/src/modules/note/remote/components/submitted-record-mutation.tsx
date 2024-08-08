import { useEffect } from 'react';

import { SubmittedRecord } from '~collab/client/submitted-record';

import { gql } from '../../../../__generated__/gql';
import { NoteTextField } from '../../../../__generated__/graphql';
import { useCustomApolloClient } from '../../../apollo-client/context/custom-apollo-client-provider';
import {
  collabTextRecordToEditorRevisionRecord,
  submittedRecordToCollabTextRecordInput,
} from '../../../collab/editor-graphql-mapping';
import { useNoteContentId } from '../context/note-content-id-provider';
import { useNoteTextFieldEditor } from '../context/note-text-field-editors-provider';
import { useUpdateNote } from '../hooks/use-update-note';

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
export function SubmittedRecordMutation({
  fieldName,
}: SubmittedRecordMutationProps) {
  const customApolloClient = useCustomApolloClient();
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
      customApolloClient.writeFragmentNoRetain({
        id: customApolloClient.cache.identify({
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
  }, [editor, noteContentId, fieldName, updateNote, customApolloClient]);

  return null;
}
