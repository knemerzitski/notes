import useHTMLInput from './useHTMLInput';
import useEditor from './useEditor';

export interface UseHTMLInputEditorProps {
  collabTextId: string;
}

export default function useHTMLInputEditor({ collabTextId }: UseHTMLInputEditorProps) {
  const editor = useEditor(collabTextId);

  const { handleSelect, handleInput } = useHTMLInput({
    onInsert({ selectionStart, selectionEnd, insertText }) {
      editor.setSelectionRange(selectionStart, selectionEnd);
      editor.insertText(insertText);
    },
    onDelete({ selectionStart, selectionEnd }) {
      editor.setSelectionRange(selectionStart, selectionEnd);
      editor.deleteText(1);
    },
    onUndo() {
      editor.undo();
    },
    onRedo() {
      editor.redo();
    },
  });

  return {
    handleSelect,
    handleInput,
  };
}
