import { FormEventHandler, useCallback, useRef } from 'react';

interface SelectionEvent {
  /**
   * Selection start position before text insertion.
   */
  selectionStart: number;
  /**
   * Selection end position before text insertion.
   */
  selectionEnd: number;
  /**
   * Selection direction position before text insertion.
   */
  selectionDirection: HTMLInputElement['selectionDirection'];
}

interface InsertEvent extends SelectionEvent {
  insertText: string;
}

type DeleteEvent = SelectionEvent;

export interface InputValueChangeProps {
  onInsert?(event: InsertEvent): void;
  onDelete?(event: DeleteEvent): void;
  onUndo?(): void;
  onRedo?(): void;
}

/**
 * Calls prop events with selection information on value change.
 */
export default function useInputValueChange({
  onInsert,
  onDelete,
  onUndo,
  onRedo,
}: InputValueChangeProps) {
  const selectionRef = useRef<
    Pick<HTMLInputElement, 'selectionStart' | 'selectionEnd' | 'selectionDirection'>
  >({
    selectionStart: 0,
    selectionEnd: 0,
    selectionDirection: 'none',
  });

  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

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

    selectionRef.current = {
      selectionStart: e.target.selectionStart,
      selectionEnd: e.target.selectionEnd,
      selectionDirection: e.target.selectionDirection,
    };
  }, []);

  const handleInput: FormEventHandler<HTMLDivElement> = useCallback((e) => {
    if (
      (!(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLInputElement)) ||
      !(e.nativeEvent instanceof InputEvent)
    ) {
      return;
    }

    const type = e.nativeEvent.inputType;

    const beforeStart = selectionRef.current.selectionStart ?? 0;
    const beforeEnd = selectionRef.current.selectionEnd ?? 0;
    const beforeDirection = selectionRef.current.selectionDirection;

    if (type.match(/insert/i)) {
      e.preventDefault();
      const start = e.target.selectionStart ?? 0;
      const value = e.target.value;
      onInsertRef.current?.({
        selectionStart: beforeStart,
        selectionEnd: beforeEnd,
        selectionDirection: beforeDirection,
        insertText: value.substring(beforeStart, start),
      });
    } else if (type.match(/delete/i)) {
      e.preventDefault();
      onDeleteRef.current?.({
        selectionStart: beforeStart,
        selectionEnd: beforeEnd,
        selectionDirection: beforeDirection,
      });
    } else if (type.match(/undo/i)) {
      e.preventDefault();
      onUndoRef.current?.();
    } else if (type.match(/redo/i)) {
      e.preventDefault();
      onRedoRef.current?.();
    }
  }, []);

  return {
    onSelect: handleSelect,
    onInput: handleInput,
  };
}
