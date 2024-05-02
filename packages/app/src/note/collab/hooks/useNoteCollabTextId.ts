import { NoteTextField } from '../../../__generated__/graphql';
import useNoteCollabTextFieldIds from './useNoteCollabTextIds';

export default function useNoteCollabTextFieldId(
  noteContentId: string,
  fieldName: NoteTextField
) {
  const collabTextFields = useNoteCollabTextFieldIds(noteContentId);

  const collabText = collabTextFields.find((textField) => textField.key === fieldName);
  if (!collabText) {
    throw new Error(`Note '${noteContentId}' text field ${fieldName} not found`);
  }

  return String(collabText.value.id);
}
