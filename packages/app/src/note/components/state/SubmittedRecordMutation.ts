import useUpdateNote from '../../hooks/useUpdateNote';
import { NoteTextField } from '../../../__generated__/graphql';
import { useEffect } from 'react';
import { SubmittedRecord } from '~collab/client/submitted-record';
import {
  collabTextRecordToEditorRevisionRecord,
  submittedRecordToCollabTextRecordInput,
} from '../../../collab/editor-graphql-adapter';
import { useNoteTextFieldEditor } from '../../context/NoteTextFieldEditorsProvider';
import { useNoteContentId } from '../../context/NoteContentIdProvider';

export interface SubmittedRecordMutationProps {
  fieldName: NoteTextField;
}

/**
 * Listens for submittedRecord. Sends it to server and acknowleges the response.
 */
export default function SubmittedRecordMutation({
  fieldName,
}: SubmittedRecordMutationProps) {
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

      const newRecord = data?.updateNote.patch?.textFields?.find(
        (textField) => textField.key === fieldName
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
  }, [editor, noteContentId, fieldName, updateNote]);

  return null;
}
