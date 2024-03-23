import { NoteTextField } from '../../../__generated__/graphql';
import useHTMLInputCollaborativeEditor from '../../../collab/hooks/useHTMLInputCollaborativeEditor';
import { useSuspenseNoteEditor } from '../context/NoteEditorsProvider';

export default function useNoteField(field: NoteTextField) {
  const editor = useSuspenseNoteEditor(field);

  return useHTMLInputCollaborativeEditor({
    editor,
  });
}
