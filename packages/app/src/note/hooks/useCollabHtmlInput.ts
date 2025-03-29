import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Options, useDebouncedCallback } from 'use-debounce';

import { CollabService } from '../../../../collab/src/client/collab-service';
import { SelectionRange } from '../../../../collab/src/client/selection-range';
import { RevisionChangeset } from '../../../../collab/src/records/record';
import { EMPTY_ARRAY } from '../../../../utils/src/array/empty';

import { useLogger } from '../../utils/context/logger';
import { NoteTextFieldEditor } from '../types';

import { useHtmlInput } from './useHtmlInput';

interface UseHTMLInputCollabEditorOptions {
  merge?: {
    /**
     * @default 2000 milliseconds
     */
    wait?: number;
    /**
     * @default {maxWait: 6000}
     */
    options?: Options;
  };
}

export function useCollabHtmlInput(
  editor: NoteTextFieldEditor,
  service: Pick<CollabService, 'undo' | 'redo' | 'headRevision'>,
  options?: UseHTMLInputCollabEditorOptions
) {
  const logger = useLogger('useCollabHtmlInput');

  // Counter only for rerendering purposes
  const [renderCounter, setRenderCounter] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const prevSelectionRef = useRef<SelectionRange | null>(null);
  const forceSelectionRef = useRef<SelectionRange | null>(null);
  const latestTypingSelectionRef = useRef<SelectionRange | null>(null);

  const externalChangesSinceLastRenderRef =
    useRef<readonly RevisionChangeset[]>(EMPTY_ARRAY);
  externalChangesSinceLastRenderRef.current = EMPTY_ARRAY;

  const value = editor.value;

  const adjustSelectionToExternalChanges = useCallback(
    (selection: SelectionRange | undefined) =>
      selection
        ? externalChangesSinceLastRenderRef.current.reduce(
            (sel, { changeset }) =>
              SelectionRange.closestRetainedPosition(sel, changeset),
            selection
          )
        : undefined,
    []
  );

  const getInputSelection = useCallback(() => {
    if (!inputRef.current) {
      return;
    }

    const start = inputRef.current.selectionStart ?? 0;

    return {
      start,
      end: inputRef.current.selectionEnd ?? start,
    };
  }, []);

  const forceSetSelection = useCallback(
    (selection: SelectionRange | undefined) => {
      if (!selection) {
        return;
      }

      if (
        forceSelectionRef.current &&
        SelectionRange.isEqual(forceSelectionRef.current, selection)
      ) {
        return;
      }
      logger?.debug('forceSetSelection', {
        selection,
      });

      forceSelectionRef.current = selection;
      setRenderCounter((prev) => prev + 1);
    },
    [logger]
  );

  // Reset state when editor changes
  useEffect(() => {
    setRenderCounter(0);
    forceSelectionRef.current = null;
    externalChangesSinceLastRenderRef.current = EMPTY_ARRAY;
  }, [editor]);

  // Adjust selection to external changes
  useEffect(() => {
    return editor.eventBus.on('handledExternalChanges', (changes) => {
      externalChangesSinceLastRenderRef.current = [
        ...externalChangesSinceLastRenderRef.current,
        ...changes,
      ];
      logger?.debug(
        'eventBus.handledExternalChanges',
        externalChangesSinceLastRenderRef.current
      );

      forceSetSelection(adjustSelectionToExternalChanges(getInputSelection()));

      if (prevSelectionRef.current) {
        const newSelection = adjustSelectionToExternalChanges(prevSelectionRef.current);
        if (newSelection) {
          prevSelectionRef.current = newSelection;
        }
      }
      if (latestTypingSelectionRef.current) {
        const newSelection = adjustSelectionToExternalChanges(
          latestTypingSelectionRef.current
        );
        if (newSelection) {
          latestTypingSelectionRef.current = newSelection;
        }
      }
    });
  }, [
    editor,
    logger,
    forceSetSelection,
    getInputSelection,
    adjustSelectionToExternalChanges,
  ]);

  // Update value after view changed
  useEffect(() => {
    return editor.eventBus.on('valueChanged', (value) => {
      logger?.debug('eventBus.valueChanged', JSON.stringify(value));

      setRenderCounter((prev) => prev + 1);
    });
  }, [editor, logger]);

  // Request focus when undo or redo
  useEffect(
    () =>
      editor.eventBus.on(['appliedRedo', 'appliedUndo'], ({ type }) => {
        logger?.debug(`eventBus.${type}`);
        inputRef.current?.focus();
      }),
    [editor, logger]
  );

  // User typed/deleted something or undo/redo
  useEffect(() => {
    return editor.eventBus.on('selectionChanged', (selection) => {
      logger?.debug('eventBus.selectionChanged', selection.start);
      latestTypingSelectionRef.current = selection;
      forceSetSelection(selection);
    });
  }, [editor, logger, forceSetSelection]);

  // Apply forceSelection on input
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input == null || forceSelectionRef.current == null) {
      return;
    }

    logger?.debug('setSelectionRange', {
      selection: forceSelectionRef.current,
      inputValue: input.value,
    });
    input.setSelectionRange(
      forceSelectionRef.current.start,
      forceSelectionRef.current.end
    );
    forceSelectionRef.current = null;
  }, [renderCounter, logger]);

  // Merge changes made in a short duration
  const isMergeChangesRef = useRef<'insert' | 'delete' | null>(null);
  const debouncedResetMergeChanges = useDebouncedCallback(
    () => {
      logger?.debug('merge:stop', {
        value: editor.value,
      });
      isMergeChangesRef.current = null;
    },
    options?.merge?.wait ?? 2000,
    {
      maxWait: options?.merge?.options?.maxWait ?? 6000,
      ...options?.merge?.options,
    }
  );

  function startDebouncedMerge(type: 'insert' | 'delete') {
    if (isMergeChangesRef.current === type) {
      return;
    }

    if (!isMergeChangesRef.current) {
      logger?.debug('merge:start', {
        type,
        value: editor.value,
      });
    } else {
      logger?.debug('merge:type', {
        value: editor.value,
        from: isMergeChangesRef.current,
        to: type,
      });
    }

    isMergeChangesRef.current = type;
    debouncedResetMergeChanges();
  }

  function stopDebouncedMerge() {
    logger?.debug('merge:flush', {
      value: editor.value,
    });
    debouncedResetMergeChanges.flush();
  }

  const htmlInput = useHtmlInput({
    onInsert({ beforeSelection, insertValue }) {
      const adjustedBeforeSelection =
        adjustSelectionToExternalChanges(beforeSelection) ?? beforeSelection;

      logger?.debug('onInsert', {
        insertValue,
        beforeSelection,
        adjustedBeforeSelection,
        value: inputRef.current?.value,
        externalChanges: externalChangesSinceLastRenderRef.current.map(
          ({ changeset, revision }) => `${revision}@${changeset.toString()}`
        ),
      });

      editor.insert(insertValue, adjustedBeforeSelection, {
        type: isMergeChangesRef.current === 'insert' ? 'merge' : undefined,
      });
      startDebouncedMerge('insert');
    },
    onDelete({ beforeSelection }) {
      const adjustedBeforeSelection =
        adjustSelectionToExternalChanges(beforeSelection) ?? beforeSelection;

      logger?.debug('onDelete', {
        beforeSelection,
        adjustedBeforeSelection,
        value: inputRef.current?.value,
        externalChanges: externalChangesSinceLastRenderRef.current.map(
          ({ changeset, revision }) => `${revision}@${changeset.toString()}`
        ),
      });

      editor.delete(1, adjustedBeforeSelection, {
        type: isMergeChangesRef.current === 'delete' ? 'merge' : undefined,
      });
      startDebouncedMerge('delete');
    },
    onSelect(selection) {
      try {
        if (latestTypingSelectionRef.current) {
          const latestTypingSelection = latestTypingSelectionRef.current;
          latestTypingSelectionRef.current = null;

          if (SelectionRange.isEqual(latestTypingSelection, selection)) {
            logger?.debug('onSelect:ignoreFromTyping');
            return;
          }
        }

        let newSelection: SelectionRange;
        if (externalChangesSinceLastRenderRef.current.length > 0) {
          // If have external changes, must adjust selection accordingly
          newSelection = adjustSelectionToExternalChanges(selection) ?? selection;
          logger?.debug('onSelect:adjusted', newSelection.start);
          forceSetSelection(newSelection);
        } else {
          newSelection = selection;
          logger?.debug('onSelect:default', newSelection.start);
          // Clear force set selection since user is overwriting it
          forceSelectionRef.current = null;

          // Stop merging typings when user changes selection
          if (
            prevSelectionRef.current &&
            !SelectionRange.isEqual(prevSelectionRef.current, selection)
          ) {
            stopDebouncedMerge();
          }
        }

        editor.sharedEventBus.emit('selectionChanged', {
          source: 'immutable',
          editor,
          selection: newSelection,
        });
      } finally {
        prevSelectionRef.current = selection;
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
    ...htmlInput,
    inputRef,
    value,
  };
}
