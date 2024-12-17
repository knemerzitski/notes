import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Options, useDebouncedCallback } from 'use-debounce';

import { CollabService } from '~collab/client/collab-service';
import { SelectionRange } from '~collab/client/selection-range';

import { NoteTextFieldEditor } from '../external-state/note';

import { useHtmlInput } from './useHtmlInput';

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
  service: Pick<CollabService, 'undo' | 'redo' | 'headRevision'>,
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

  const isForceSelectionChangeRef = useRef<boolean>(false);

  function updateLatestSelection(newSelection: SelectionRange) {
    latestSelectionRef.current = newSelection;
    setSelection((prev) => {
      if (SelectionRange.isEqual(prev, newSelection)) {
        return prev;
      }

      isForceSelectionChangeRef.current = true;
      return newSelection;
    });
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

      updateLatestSelection(newSelection);
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

  const htmlInput = useHtmlInput({
    onInsert({ beforeSelection, insertValue }) {
      // TODO is this selection in correct spot, or it needs adjustment?
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
    onSelect(newSelection) {
      if (
        isForceSelectionChangeRef.current &&
        SelectionRange.isEqual(selection, newSelection)
      ) {
        isForceSelectionChangeRef.current = false;
      } else {
        // User changed selection without modifying value
        editor.sharedEventBus.emit('selectionChanged', {
          source: 'immutable',
          editor,
          selection: newSelection,
        });
      }
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
    onSelect: htmlInput.handleSelect,
    onInput: htmlInput.handleInput,
    onKeyDown: htmlInput.handleKeyDown,
  };
}
