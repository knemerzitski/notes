import { FormEventHandler, KeyboardEventHandler, useCallback, useRef } from 'react';
import { SelectionRange } from '~collab/client/selection-range';

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

  const handleSelect: FormEventHandler<HTMLInputElement> = useCallback((e) => {
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

    onSelectRef.current?.(selectionRef.current);
  }, []);

  const handleInput: FormEventHandler<HTMLDivElement> = useCallback((e) => {
    if (
      (!(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLInputElement)) ||
      !(e.nativeEvent instanceof InputEvent)
    ) {
      return;
    }

    const beforeSelection = selectionRef.current;
    const type = e.nativeEvent.inputType;

    if (/insert/i.exec(type) != null || e.nativeEvent.data) {
      e.preventDefault();
      const start = e.target.selectionStart ?? 0;
      const value = e.target.value;
      onInsertRef.current?.({
        beforeSelection,
        insertValue: value.substring(beforeSelection.start, start),
      });
    } else if (
      /delete/i.exec(type) != null ||
      (e.nativeEvent instanceof KeyboardEvent && e.nativeEvent.code === 'Backspace')
    ) {
      e.preventDefault();
      onDeleteRef.current?.({
        beforeSelection,
      });
    } else if (/undo/i.exec(type)) {
      e.preventDefault();
      onUndoRef.current?.();
    } else if (/redo/i.exec(type)) {
      e.preventDefault();
      onRedoRef.current?.();
    }
  }, []);

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
    handleSelect,
    handleInput,
    handleKeyDown,
  };
}
