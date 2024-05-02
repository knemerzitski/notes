import useHTMLInput from './useHTMLInput';
import useEditor from './useEditor';

export default function useHTMLInputEditor(
  editor: Pick<
    ReturnType<typeof useEditor>,
    'insertText' | 'deleteText' | 'setSelectionRange' | 'undo' | 'redo'
  >
) {
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
