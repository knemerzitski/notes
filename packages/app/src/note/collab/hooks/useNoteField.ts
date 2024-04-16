import { NoteTextField } from '../../../__generated__/graphql';
import useHTMLInputCollaEditor from '../../../collab/hooks/useHTMLInputCollabEditor';
import { useSuspenseNoteEditor } from '../context/NoteEditorsProvider';

export default function useNoteField(field: NoteTextField) {
  const editor = useSuspenseNoteEditor(field);

  return useHTMLInputCollaEditor({
    editor,
  });
}
