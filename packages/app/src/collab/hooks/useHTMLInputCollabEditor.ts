import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { CollabEditor, CollabEditorEvents } from '~collab/editor/collab-editor';

import useHTMLInput from './useHTMLInput';
import { SelectionRange } from '~collab/client/selection-range';
import { Emitter } from '~utils/mitt-unsub';

type PartialEditor = Readonly<
  Pick<CollabEditor, 'viewText' | 'insertText' | 'deleteTextCount' | 'undo' | 'redo'> & {
    eventBus: Emitter<
      Pick<
        CollabEditorEvents,
        'viewChanged' | 'processingMessages' | 'appliedTypingOperation'
      >
    >;
  }
>;

export interface UseHTMLInputCollaborativeEditorProps {
  editor: PartialEditor;
}

// TODO test with cypress
export default function useHTMLInputCollaborativeEditor({
  editor,
}: UseHTMLInputCollaborativeEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState(editor.viewText);
  const [selection, setSelection] = useState<SelectionRange>({
    start: 0,
    end: 0,
  });

  // Temporarily remember input selection if any useEffects runs multiple times between renders
  const inputSelectionRef = useRef<SelectionRange | null>(null);
  inputSelectionRef.current = null;

  // Keep selection in place after external change
  useEffect(() => {
    return editor.eventBus.on('processingMessages', ({ eventBus: processingBus }) => {
      const input = inputRef.current;
      if (!input) return;

      if (input.selectionStart == null) return;

      let inputSelection: SelectionRange;
      if (inputSelectionRef.current === null) {
        inputSelectionRef.current = {
          start: input.selectionStart,
          end: input.selectionEnd ?? input.selectionStart,
        };
      }
      inputSelection = inputSelectionRef.current;

      processingBus.on('handledExternalChange', ({ viewComposable }) => {
        inputSelection = SelectionRange.followChangeset(inputSelection, viewComposable);
      });

      processingBus.on('messagesProcessed', ({ hadExternalChanges }) => {
        if (!hadExternalChanges) return;

        inputSelectionRef.current = inputSelection;
        setSelection(inputSelection);
      });
    });
  }, [editor]);

  // Update value after view changed
  useEffect(() => {
    return editor.eventBus.on('viewChanged', () => {
      setValue(editor.viewText);
    });
  }, [editor]);

  // User typed/deleted something or undo/redo
  useEffect(() => {
    return editor.eventBus.on('appliedTypingOperation', ({ operation }) => {
      setSelection(operation.selection);
    });
  }, [editor]);

  // Update input selection from state
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input == null) return;
    input.setSelectionRange(selection.start, selection.end);
  }, [selection]);

  // Adjust selection from input that's outdated relative to editor
  function getAdjustedSelection(newSelection: SelectionRange) {
    const offset =
      inputSelectionRef.current != null
        ? SelectionRange.subtract(inputSelectionRef.current, selection)
        : SelectionRange.ZERO;
    return SelectionRange.add(newSelection, offset);
  }

  const { handleSelect, handleInput } = useHTMLInput({
    onInsert({ beforeSelection, insertText }) {
      editor.insertText(insertText, getAdjustedSelection(beforeSelection));
    },
    onDelete({ beforeSelection }) {
      editor.deleteTextCount(1, getAdjustedSelection(beforeSelection));
    },
    onUndo() {
      editor.undo();
    },
    onRedo() {
      editor.redo();
    },
  });

  return {
    inputRef,
    value,
    handleSelect,
    handleInput,
  };
}
