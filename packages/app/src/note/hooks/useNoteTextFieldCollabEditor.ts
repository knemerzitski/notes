import { NoteTextField } from '../../__generated__/graphql';
import useCollabEditor from '../../collab/hooks/useCollabEditor';
import useNoteTextFieldId from './useNoteTextFieldId';

export default function useNoteTextFieldCollabEditor(
  noteContentId: string,
  fieldName: NoteTextField
) {
  const collabTextId = useNoteTextFieldId(noteContentId, fieldName);
  return useCollabEditor(collabTextId);
}
