import {
  // FormEventHandler,
  // useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Options, useDebouncedCallback } from 'use-debounce';

import { CollabService } from '~collab/client/collab-service';
import { SelectionRange } from '~collab/client/selection-range';

// import { useNoteId } from '../context/note-id';
import { RevisionChangeset } from '~collab/records/record';

import { NoteTextFieldEditor } from '../external-state/note';

import { useHtmlInput } from './useHtmlInput';
// import { useUpdateOpenNoteSelectionRange } from './useUpdateOpenNoteSelectionRange';

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

  // console.log('useCollabHtmlInput.render', service.headRevision);

  const externalChangesSinceLastRenderRef = useRef<RevisionChangeset[]>([]);
  externalChangesSinceLastRenderRef.current = [];

  const latestSelectionRef = useRef<SelectionRange | null>(null);
  latestSelectionRef.current = null;

  function updateLatestSelection(newSelection: SelectionRange) {
    latestSelectionRef.current = newSelection;
    setSelection((prev) => {
      if (SelectionRange.isEqual(prev, newSelection)) {
        return prev;
      }
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
      // console.log('useCollabHtmlInput.handledExternalChanges', changes.length);
      externalChangesSinceLastRenderRef.current.push(...changes);
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
      // Adjust selection to external changes
      let adjustedSelection = beforeSelection;
      for (const { changeset } of externalChangesSinceLastRenderRef.current) {
        adjustedSelection = SelectionRange.closestRetainedPosition(
          adjustedSelection,
          changeset
        );
      }

      // console.log('useCollabHtmlInput.onInsert', {
      //   insertValue,
      //   external: externalChangesSinceLastRenderRef.current,
      //   beforeSelection,
      //   latestSelection: latestSelectionRef.current,
      //   adjustedSelection,
      // });

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

  // const updateOpenNoteSelectionRange = useUpdateOpenNoteSelectionRange();
  // also a separate component!!
  // TODO debounce selection update, ignore when selection is on same index, external change??
  // const noteId = useNoteId();
  // const prevSelectionRef = useRef<SelectionRange | null>(null);
  // const htmlInputHandleSelect = htmlInput.handleSelect;
  // const handleSelect: FormEventHandler<HTMLInputElement> = useCallback(
  //   (e) => {
  //     htmlInputHandleSelect(e);
  //     if (
  //       !(e.target instanceof HTMLTextAreaElement) &&
  //       !(e.target instanceof HTMLInputElement)
  //     ) {
  //       return;
  //     }

  //     const start = e.target.selectionStart ?? 0;
  //     const selection = {
  //       start: start,
  //       end: e.target.selectionEnd ?? start,
  //     };

  //     if (
  //       !prevSelectionRef.current ||
  //       !SelectionRange.isEqual(prevSelectionRef.current, selection)
  //     ) {
  //       prevSelectionRef.current = selection;

  //       const collabServiceSelection = editor.getCollabServiceSelection(selection);
  //       void updateOpenNoteSelectionRange({
  //         noteId,
  //         revision: service.headRevision,
  //         selectionRange: collabServiceSelection,
  //       });
  //     }
  //   },
  //   [htmlInputHandleSelect, updateOpenNoteSelectionRange, noteId, service, editor]
  // );

  return {
    inputRef,
    value,
    // onSelect: handleSelect,
    onSelect: htmlInput.handleSelect,
    onInput: htmlInput.handleInput,
    onKeyDown: htmlInput.handleKeyDown,
  };
}
