import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ChangeSource } from '~collab/client/document-client';
import {
  CollaborativeEditor,
  Events as CollaborativeEditorEvents,
} from '~collab/editor/collaborative-editor';
import { SelectionDirection } from '~collab/editor/selection-range';

import useHTMLInput from './useHTMLInput';

function asEditorDirection(direction: HTMLInputElement['selectionDirection']) {
  if (direction === 'forward') {
    return SelectionDirection.Forward;
  } else if (direction === 'backward') {
    return SelectionDirection.Backward;
  }
  return SelectionDirection.None;
}

function asInputDirection(direction: SelectionDirection) {
  if (direction === SelectionDirection.Forward) {
    return 'forward';
  } else if (direction === SelectionDirection.Backward) {
    return 'backward';
  }
  return 'none';
}

type Editor = Readonly<
  Pick<
    CollaborativeEditor,
    | 'value'
    | 'selectionStart'
    | 'selectionEnd'
    | 'selectionDirection'
    | 'eventBus'
    | 'setSelectionRange'
    | 'insertText'
    | 'deleteTextCount'
    | 'undo'
    | 'redo'
  >
>;

export interface UseHTMLInputCollaborativeEditorProps {
  editor: Editor;
}

export default function useHTMLInputCollaborativeEditor({
  editor,
}: UseHTMLInputCollaborativeEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState(editor.value);
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
    direction: HTMLInputElement['selectionDirection'];
  }>({
    start: editor.selectionStart,
    end: editor.selectionEnd,
    direction: asInputDirection(editor.selectionDirection),
  });

  const latestInputSelectionRef = useRef({
    start: selection.start,
    end: selection.end,
  });

  const syncEditorSelectionFromInput = useCallback(() => {
    const input = inputRef.current;
    // TODO test activeElement
    if (
      !input?.selectionStart ||
      !input.selectionEnd /* || !input.contains(document.activeElement) */
    )
      return;

    const startOffset = editor.selectionStart - latestInputSelectionRef.current.start;
    const endOffset = editor.selectionEnd - latestInputSelectionRef.current.end;

    editor.setSelectionRange(
      input.selectionStart + startOffset,
      input.selectionEnd + endOffset,
      asEditorDirection(input.selectionDirection)
    );
  }, [editor]);

  /**
   * Update editor selection from input when external change is about to happen.
   * Keeps selection in place after the change.
   */
  useEffect(() => {
    const handleViewChange: (e: CollaborativeEditorEvents['viewChange']) => void = ({
      source,
    }) => {
      if (source == ChangeSource.External) {
        syncEditorSelectionFromInput();
      }
    };

    editor.eventBus.on('viewChange', handleViewChange);

    return () => {
      editor.eventBus.off('viewChange', handleViewChange);
    };
  }, [editor, syncEditorSelectionFromInput]);

  /**
   * Update value after view changed
   */
  useEffect(() => {
    const handleViewChanged: (e: CollaborativeEditorEvents['viewChanged']) => void = ({
      view,
    }) => {
      setValue(view.joinInsertions());
    };

    editor.eventBus.on('viewChanged', handleViewChanged);

    return () => {
      editor.eventBus.off('viewChanged', handleViewChanged);
    };
  }, [editor]);

  /**
   * Update selection from editor
   */
  useEffect(() => {
    const handleSelectionChanged: (
      e: CollaborativeEditorEvents['selectionChanged']
    ) => void = ({ start, end, direction }) => {
      setSelection({
        start,
        end,
        direction: asInputDirection(direction),
      });
    };

    editor.eventBus.on('selectionChanged', handleSelectionChanged);

    return () => {
      editor.eventBus.off('selectionChanged', handleSelectionChanged);
    };
  }, [editor]);

  /**
   * Update input selection from state
   */
  useLayoutEffect(() => {
    if (inputRef.current == null) return;

    const input = inputRef.current;

    input.setSelectionRange(
      selection.start,
      selection.end,
      selection.direction ?? input.selectionDirection ?? undefined
    );
    latestInputSelectionRef.current = {
      start: selection.start,
      end: selection.end,
    };
  }, [selection]);

  const { handleSelect, handleInput } = useHTMLInput({
    onInsert({ selectionStart, selectionEnd, selectionDirection, insertText }) {
      const startOffset = editor.selectionStart - selection.start;
      const endOffset = editor.selectionEnd - selection.end;

      editor.setSelectionRange(
        selectionStart + startOffset,
        selectionEnd + endOffset,
        asEditorDirection(selectionDirection)
      );

      editor.insertText(insertText);
    },
    onDelete({ selectionStart, selectionEnd, selectionDirection }) {
      const startOffset = editor.selectionStart - selection.start;
      const endOffset = editor.selectionEnd - selection.end;

      editor.setSelectionRange(
        selectionStart + startOffset,
        selectionEnd + endOffset,
        asEditorDirection(selectionDirection)
      );

      editor.deleteTextCount(1);
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
    handleSelect,
    handleInput,
  };
}
