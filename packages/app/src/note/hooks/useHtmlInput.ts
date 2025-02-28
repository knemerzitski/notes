import { FormEventHandler, KeyboardEventHandler, useCallback, useRef } from 'react';
import { SelectionRange } from '~collab/client/selection-range';
import { useLogger } from '../../utils/context/logger';

export interface SelectionEvent {
  /**
   * Selection before text insertion/deletion
   */
  beforeSelection: Readonly<SelectionRange>;
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
  onSelect?: (selection: SelectionRange) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  const logger = useLogger('useHtmlInput');

  const selectionRef = useRef<SelectionRange>({
    start: 0,
    end: 0,
  });

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

  const handleSelect: FormEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLInputElement)
      ) {
        return;
      }

      const start = e.target.selectionStart ?? 0;
      selectionRef.current = {
        start: start,
        end: e.target.selectionEnd ?? start,
      };

      logger?.debug('handleSelect', selectionRef.current);

      onSelectRef.current?.(selectionRef.current);
    },
    [logger]
  );

  const handleBeforeInput: FormEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (
        (!(e.target instanceof HTMLTextAreaElement) &&
          !(e.target instanceof HTMLInputElement)) ||
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        !(e.nativeEvent instanceof TextEvent)
      ) {
        return;
      }

      const start = e.target.selectionStart ?? 0;
      selectionRef.current = {
        start: start,
        end: e.target.selectionEnd ?? start,
      };

      logger?.debug('handleBeforeInput', selectionRef.current);
    },
    [logger]
  );

  const handleInput: FormEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (
        (!(e.target instanceof HTMLTextAreaElement) &&
          !(e.target instanceof HTMLInputElement)) ||
        !(e.nativeEvent instanceof InputEvent)
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
        let beforeSelection: SelectionRange;
        if (
          e.nativeEvent.data != null &&
          e.nativeEvent.data !== insertValueFromSelection
        ) {
          // TODO remove error logging
          logger?.error(
            'handleInput:insert nativeEvent.data does not match insertValue',
            debugData
          );

          insertValue = e.nativeEvent.data;
          const beforeStart = start - insertValue.length;
          beforeSelection = {
            start: beforeStart,
            end: beforeStart,
          };
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
        (e.nativeEvent instanceof KeyboardEvent && e.nativeEvent.code === 'Backspace')
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
        logger?.error('handleInput:unknown', e);
      }
    },
    [logger]
  );

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> =
    useCallback((e) => {
      // ctrl+z
      const isUndo = e.ctrlKey && e.code === 'KeyZ';
      // ctrl+y | ctrl+shift+z
      const isRedo =
        (e.ctrlKey && e.code === 'KeyY') ||
        (e.ctrlKey && e.shiftKey && e.code === 'KeyZ');
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
