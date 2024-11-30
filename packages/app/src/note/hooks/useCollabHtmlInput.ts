/* eslint-disable unicorn/filename-case */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Options, useDebouncedCallback } from 'use-debounce';
import { useHtmlInput } from './useHtmlInput';
import { SelectionRange } from '~collab/client/selection-range';
import { NoteTextFieldEditor } from '../external-state/note';
import { CollabService } from '~collab/client/collab-service';

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

export function useCollabHtmlInput(
  editor: NoteTextFieldEditor,
  service: Pick<CollabService, 'undo' | 'redo'>,
  options?: UseHTMLInputCollabEditorOptions
) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState(editor.value);
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
    setValue(editor.value);
    setSelection({
      start: 0,
      end: 0,
    });
    latestSelectionRef.current = null;
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

    return editor.eventBus.on('handledExternalChanges', (changes) => {
      if (changes.length === 0) return;

      const latestSelection = getLatestSelection();
      if (!latestSelection) return;

      let newSelection = latestSelection;
      for (const { changeset } of changes) {
        newSelection = SelectionRange.closestRetainedPosition(newSelection, changeset);
      }

      if (!SelectionRange.isEqual(latestSelection, newSelection)) {
        updateLatestSelection(newSelection);
      }
    });
  }, [editor]);

  // Update value after view changed
  useEffect(() => {
    return editor.eventBus.on('valueChanged', (value) => {
      setValue(value);
    });
  }, [editor]);

  // User typed/deleted something or undo/redo
  useEffect(() => {
    return editor.eventBus.on('selectionChanged', (selection) => {
      // comapre values?
      updateLatestSelection(selection);
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

  const { handleSelect, handleInput, handleKeyDown } = useHtmlInput({
    onInsert({ beforeSelection, insertValue }) {
      editor.insert(insertValue, latestSelectionRef.current ?? beforeSelection, {
        merge: isMergeChangesRef.current,
      });
      startDebouncedMerge();
    },
    onDelete({ beforeSelection }) {
      editor.delete(1, latestSelectionRef.current ?? beforeSelection, {
        merge: isMergeChangesRef.current,
      });
      startDebouncedMerge();
    },
    onUndo() {
      service.undo();
    },
    onRedo() {
      service.redo();
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
