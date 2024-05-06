import { FormEventHandler, useCallback, useRef } from 'react';
import { SelectionRange } from '~collab/client/selection-range';

interface SelectionEvent {
  /**
   * Selection before text insertion/deletion.
   */
  beforeSelection: Readonly<SelectionRange>;
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
export default function useHTMLInput({
  onInsert,
  onDelete,
  onUndo,
  onRedo,
}: InputValueChangeProps) {
  const selectionRef = useRef<SelectionRange>({
    start: 0,
    end: 0,
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

    const start = e.target.selectionStart ?? 0;
    selectionRef.current = {
      start: start,
      end: e.target.selectionEnd ?? start,
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

    const beforeSelection = selectionRef.current;

    if (type.match(/insert/i)) {
      e.preventDefault();
      const start = e.target.selectionStart ?? 0;
      const value = e.target.value;
      onInsertRef.current?.({
        beforeSelection,
        insertText: value.substring(beforeSelection.start, start),
      });
    } else if (type.match(/delete/i)) {
      e.preventDefault();
      onDeleteRef.current?.({
        beforeSelection,
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
    handleSelect,
    handleInput,
  };
}
