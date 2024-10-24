import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Options, useDebouncedCallback } from 'use-debounce';
import { CollabEditor } from '~collab/client/collab-editor';
import { SelectionRange } from '~collab/client/selection-range';

import { useHTMLInput } from './use-html-input';

interface UseHTMLInputCollabEditorOptions {
  merge?: {
    /**
     * @default 1000 milliseconds
     */
    wait?: number;
    /**
     * @default {maxWait: 5000}
     */
    options?: Options;
  };
}

type PartialEditor = Readonly<
  Pick<
    CollabEditor,
    'eventBus' | 'viewText' | 'insertText' | 'deleteTextCount' | 'undo' | 'redo'
  >
>;

export function useHTMLInputCollabEditor(
  editor: PartialEditor,
  options?: UseHTMLInputCollabEditorOptions
) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState(editor.viewText);
  const [selection, setSelection] = useState<SelectionRange>({
    start: 0,
    end: 0,
  });

  const latestSelectionRef = useRef<SelectionRange | null>(null);
  latestSelectionRef.current = null;

  function updateLatestSelection(newSelection: SelectionRange) {
    latestSelectionRef.current = newSelection;
    setSelection(newSelection);
  }

  // Reset state when editor changes
  useEffect(() => {
    setValue(editor.viewText);
    setSelection({
      start: 0,
      end: 0,
    });
  }, [editor]);

  // Keep selection in place after external change
  useEffect(() => {
    function getLatestSelection() {
      return latestSelectionRef.current ?? getInputSelection();
    }

    function getInputSelection() {
      const input = inputRef.current;
      if (input?.selectionStart != null && input.selectionEnd != null) {
        return {
          start: input.selectionStart,
          end: input.selectionEnd,
        };
      }
      return;
    }

    return editor.eventBus.on('processingMessages', ({ eventBus: processingBus }) => {
      const latestSelection = getLatestSelection();
      if (!latestSelection) return;
      let newSelection = latestSelection;

      processingBus.on('handledExternalChange', ({ viewComposable }) => {
        newSelection = SelectionRange.closestRetainedPosition(
          newSelection,
          viewComposable
        );
      });

      processingBus.on('messagesProcessed', ({ hadExternalChanges }) => {
        if (!hadExternalChanges) return;

        updateLatestSelection(newSelection);
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
      updateLatestSelection(operation.selection);
    });
  }, [editor]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input == null) return;
    input.setSelectionRange(selection.start, selection.end);
  }, [selection, value]);

  // Merge changes made in a short duration
  const isMergeChangesRef = useRef(false);
  const debouncedResetMergeChanges = useDebouncedCallback(
    () => {
      isMergeChangesRef.current = false;
    },
    options?.merge?.wait ?? 1000,
    {
      maxWait: options?.merge?.options?.maxWait ?? 5000,
      ...options?.merge?.options,
    }
  );

  function startDebouncedMerge() {
    if (!isMergeChangesRef.current) {
      isMergeChangesRef.current = true;
      debouncedResetMergeChanges();
    }
  }

  const { handleSelect, handleInput, handleKeyDown } = useHTMLInput({
    onInsert({ beforeSelection, insertValue }) {
      editor.insertText(insertValue, latestSelectionRef.current ?? beforeSelection, {
        merge: isMergeChangesRef.current,
      });
      startDebouncedMerge();
    },
    onDelete({ beforeSelection }) {
      editor.deleteTextCount(1, latestSelectionRef.current ?? beforeSelection, {
        merge: isMergeChangesRef.current,
      });
      startDebouncedMerge();
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
    onSelect: handleSelect,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
  };
}
