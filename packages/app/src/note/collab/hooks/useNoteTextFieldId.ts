import { NoteTextField } from '../../../__generated__/graphql';
import useNoteCollabTextIds from './useNoteCollabTextIds';

export default function useNoteCollabTextId(
  noteContentId: string,
  fieldName: NoteTextField
) {
  const textFields = useNoteCollabTextIds(noteContentId);

  const collabText = textFields.find((textField) => textField.key === fieldName);
  if (!collabText) {
    throw new Error(`Note '${noteContentId}' text field ${fieldName} not found`);
  }

  return String(collabText.value.id);
}
