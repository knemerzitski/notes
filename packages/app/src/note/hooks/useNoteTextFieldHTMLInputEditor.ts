import { NoteTextField } from '../../__generated__/graphql';
import useHTMLInputCollabEditor from '../../collab/hooks/useHTMLInputCollabEditor';
import useNoteTextFieldCollabEditor from './useNoteTextFieldCollabEditor';

export default function useNoteTextFieldEditor(
  noteContentId: string,
  fieldName: NoteTextField
) {
  const editor = useNoteTextFieldCollabEditor(noteContentId, fieldName);

  return useHTMLInputCollabEditor(editor);
}
