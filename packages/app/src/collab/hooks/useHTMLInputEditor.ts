import useHTMLInput from './useHTMLInput';
import useEditor from './useEditor';

export default function useHTMLInputEditor(
  editor: Pick<
    ReturnType<typeof useEditor>,
    'insertText' | 'deleteText' | 'undo' | 'redo'
  >
) {
  const { handleSelect, handleInput } = useHTMLInput({
    onInsert({ selectionStart, selectionEnd, insertText }) {
      editor.insertText(insertText, {
        selection: {
          start: selectionStart,
          end: selectionEnd,
        },
      });
    },
    onDelete({ selectionStart, selectionEnd }) {
      editor.deleteText(1, {
        selection: {
          start: selectionStart,
          end: selectionEnd,
        },
      });
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
