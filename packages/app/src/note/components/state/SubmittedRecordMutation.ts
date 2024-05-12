import useUpdateNote from '../../hooks/useUpdateNote';
import { NoteTextField } from '../../../__generated__/graphql';
import { useEffect } from 'react';
import useNoteTextFieldCollabEditor from '../../hooks/useNoteTextFieldCollabEditor';
import { SubmittedRecord } from '~collab/client/submitted-record';
import {
  collabTextRecordToEditorRevisionRecord,
  submittedRecordToCollabTextRecordInput,
} from '../../../collab/utils/record-conversion';

export interface SubmittedRecordMutationProps {
  noteContentId: string;
  noteField: NoteTextField;
}

/**
 * Listens for submittedRecord. Sends it to server and acknowleges the response.
 */
export default function SubmittedRecordMutation({
  noteContentId,
  noteField,
}: SubmittedRecordMutationProps) {
  const updateNote = useUpdateNote();

  const editor = useNoteTextFieldCollabEditor(noteContentId, noteField);
  useEffect(() => {
    async function handleSubmittedRecord(submittedRecord: SubmittedRecord) {
      const { data } = await updateNote({
        variables: {
          input: {
            contentId: noteContentId,
            patch: {
              textFields: [
                {
                  key: noteField,
                  value: {
                    insertRecord: submittedRecordToCollabTextRecordInput(submittedRecord),
                  },
                },
              ],
            },
          },
        },
      });

      const newRecord = data?.updateNote.patch?.textFields?.find(
        (textField) => textField.key === noteField
      )?.value.newRecord;
      if (!newRecord) return;

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
  }, [editor, noteContentId, noteField, updateNote]);

  return null;
}
