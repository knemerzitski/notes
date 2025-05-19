import { FormEventHandler, KeyboardEventHandler, useCallback, useRef } from 'react';

import { isObjectLike } from '../../../../utils/src/type-guards/is-object-like';

import { Selection } from '../../../../collab2/src';
import { useLogger } from '../../utils/context/logger';

export interface SelectionEvent {
  /**
   * Selection before text insertion/deletion
   */
  beforeSelection: Readonly<Selection>;
}

export interface InsertEvent extends SelectionEvent {
  insertValue: string;
}

export type DeleteEvent = SelectionEvent;

/**
 * Calls prop events with selection information on value change.
 */
export function useHtmlInput({
  onInsert,
  onDelete,
  onSelect,
  onUndo,
  onRedo,
}: {
  onInsert?: (event: InsertEvent) => void;
  onDelete?: (event: DeleteEvent) => void;
  onSelect?: (selection: Selection) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  const logger = useLogger('useHtmlInput');

  const selectionRef = useRef<Selection>(Selection.ZERO);

  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const onUndoRef = useRef(onUndo);
  onUndoRef.current = onUndo;

  const onRedoRef = useRef(onRedo);
  onRedoRef.current = onRedo;

  function updateSelection(el: {
    selectionStart: number | null;
    selectionEnd: number | null;
  }) {
    const start = el.selectionStart ?? 0;
    selectionRef.current = Selection.create(start, el.selectionEnd ?? start);
  }

  const handleSelect: FormEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (!hasSelectionStartEnd(e.target)) {
        return;
      }

      updateSelection(e.target);

      logger?.debug('handleSelect', selectionRef.current);

      onSelectRef.current?.(selectionRef.current);
    },
    [logger]
  );

  const handleBeforeInput: FormEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (!hasSelectionStartEnd(e.target)) {
        return;
      }

      updateSelection(e.target);

      logger?.debug('handleBeforeInput', selectionRef.current);
    },
    [logger]
  );

  const handleInput: FormEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (
        !isInput(e.target) ||
        !hasSelectionStartEnd(e.target) ||
        !isNativeEvent(e.nativeEvent)
      ) {
        return;
      }

      const previousEventSelection = selectionRef.current;
      const type = e.nativeEvent.inputType;

      if (/insert/i.exec(type) != null || e.nativeEvent.data) {
        e.preventDefault();
        const start = e.target.selectionStart ?? 0;
        const value = e.target.value;
        const insertValueFromSelection = value.substring(
          previousEventSelection.start,
          start
        );

        const debugData = {
          previousEventSelection,
          type,
          insertValueFromSelection,
          start,
          value,
          e,
          nativeEvent: e.nativeEvent,
          nativeEventData: e.nativeEvent.data,
        };

        let insertValue: string;
        let beforeSelection: Selection;
        if (
          e.nativeEvent.data != null &&
          e.nativeEvent.data !== insertValueFromSelection
        ) {
          logger?.error(
            'handleInput:insert nativeEvent.data does not match insertValue',
            debugData
          );

          insertValue = e.nativeEvent.data;
          const beforeStart = start - insertValue.length;
          beforeSelection = Selection.create(beforeStart, beforeStart);
        } else {
          logger?.debug('handleInput:insert', debugData);
          insertValue = insertValueFromSelection;
          beforeSelection = previousEventSelection;
        }

        onInsertRef.current?.({
          beforeSelection,
          insertValue,
        });
      } else if (
        /delete/i.exec(type) != null ||
        ('code' in e.nativeEvent && e.nativeEvent.code === 'Backspace')
      ) {
        logger?.debug('handleInput:delete', {
          beforeSelection: previousEventSelection,
          type,
          e,
          nativeEvent: e.nativeEvent,
        });
        e.preventDefault();
        onDeleteRef.current?.({
          beforeSelection: previousEventSelection,
        });
      } else if (/undo/i.exec(type)) {
        logger?.debug('handleInput:undo');
        e.preventDefault();
        onUndoRef.current?.();
      } else if (/redo/i.exec(type)) {
        logger?.debug('handleInput:redo');
        e.preventDefault();
        onRedoRef.current?.();
      } else {
        // inputType: ""
        // code: "Enter"
        logger?.error('handleInput:unknown', e);
      }
    },
    [logger]
  );

  const handleKeyDown: KeyboardEventHandler<HTMLElement> = useCallback((e) => {
    if (hasSelectionStartEnd(e.target)) {
      updateSelection(e.target);
    }

    // ctrl+z
    const isUndo = e.ctrlKey && e.code === 'KeyZ';
    // ctrl+y | ctrl+shift+z
    const isRedo =
      (e.ctrlKey && e.code === 'KeyY') || (e.ctrlKey && e.shiftKey && e.code === 'KeyZ');
    if (isRedo) {
      e.preventDefault();
      onRedoRef.current?.();
    } else if (isUndo) {
      e.preventDefault();
      onUndoRef.current?.();
    }
  }, []);

  return {
    onSelect: handleSelect,
    onBeforeInput: handleBeforeInput,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
  };
}

function hasSelectionStartEnd(value: unknown): value is {
  selectionStart: number | null;
  selectionEnd: number | null;
} {
  if (!isObjectLike(value)) {
    return false;
  }

  if (
    !('selectionStart' in value) ||
    (typeof value.selectionStart !== 'number' && value.selectionStart !== null)
  ) {
    return false;
  }

  if (
    !('selectionEnd' in value) ||
    (typeof value.selectionEnd !== 'number' && value.selectionEnd !== null)
  ) {
    return false;
  }

  return true;
}

function isInput(value: unknown): value is {
  value: string;
} {
  if (!isObjectLike(value)) {
    return false;
  }

  if (!('value' in value) || typeof value.value !== 'string') {
    return false;
  }

  return true;
}

function isNativeEvent(value: unknown): value is {
  inputType: string;
  data: string | null;
  code?: string;
} {
  if (!isObjectLike(value)) {
    return false;
  }

  if (!('inputType' in value) || typeof value.inputType !== 'string') {
    return false;
  }

  if (!('data' in value) || (typeof value.data !== 'string' && value.data !== null)) {
    return false;
  }

  if ('code' in value && typeof value.code !== 'string') {
    return false;
  }

  return true;
}
