import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import {
  Changeset,
  RevisionChangeset,
  SerializedRevisionChangeset,
} from '~collab/changeset/changeset';
import { CollaborativeEditor } from '~collab/editor/collaborative-editor';
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

export interface UseCollaborativeInputEditorProps {
  initialHeadText: RevisionChangeset;
  onSubmitChanges(
    changes: SerializedRevisionChangeset
  ): Promise<RevisionChangeset['revision'] | undefined>;
  onCanSubmitLocalChanges?: () => void;
}

export default function useCollaborativeInputEditor({
  initialHeadText,
  onSubmitChanges,
  onCanSubmitLocalChanges,
}: UseCollaborativeInputEditorProps) {
  const editorRef = useRef(
    new CollaborativeEditor({
      headText: initialHeadText,
    })
  );

  const onSubmitChangesRef = useRef(onSubmitChanges);
  onSubmitChangesRef.current = onSubmitChanges;

  const onCanSubmitLocalChangesRef = useRef(onCanSubmitLocalChanges);
  onCanSubmitLocalChangesRef.current = onCanSubmitLocalChanges;

  const inputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<{
    value: string;
    selectionStart: number;
    selectionEnd: number;
    selectionDirection: HTMLInputElement['selectionDirection'];
  }>({
    value: editorRef.current.value,
    selectionStart: editorRef.current.selectionStart,
    selectionEnd: editorRef.current.selectionEnd,
    selectionDirection: asInputDirection(editorRef.current.selectionDirection),
  });

  const latestInputSelectionRef = useRef<{ start: number; end: number }>({
    start: state.selectionStart,
    end: state.selectionEnd,
  });

  /**
   * Input selection is updated with given values from state.
   */
  useLayoutEffect(() => {
    if (inputRef.current == null) return;

    const input = inputRef.current;

    input.setSelectionRange(
      state.selectionStart,
      state.selectionEnd,
      state.selectionDirection ?? input.selectionDirection ?? undefined
    );
    latestInputSelectionRef.current = {
      start: state.selectionStart,
      end: state.selectionEnd,
    };
  }, [state]);

  const { handleSelect, handleInput } = useHTMLInput({
    onInsert({ selectionStart, selectionEnd, selectionDirection, insertText }) {
      const editor = editorRef.current;

      const startOffset = editor.selectionStart - state.selectionStart;
      const endOffset = editor.selectionEnd - state.selectionEnd;

      editor.setSelectionRange(
        selectionStart + startOffset,
        selectionEnd + endOffset,
        asEditorDirection(selectionDirection)
      );

      editor.insertText(insertText);
      syncStateFromEditor();
    },
    onDelete({ selectionStart, selectionEnd, selectionDirection }) {
      const editor = editorRef.current;

      const startOffset = editor.selectionStart - state.selectionStart;
      const endOffset = editor.selectionEnd - state.selectionEnd;

      editor.setSelectionRange(
        selectionStart + startOffset,
        selectionEnd + endOffset,
        asEditorDirection(selectionDirection)
      );

      editor.deleteTextCount(1);
      syncStateFromEditor();
    },
    onUndo() {
      const editor = editorRef.current;
      editor.undo();
      syncStateFromEditor();
    },
    onRedo() {
      const editor = editorRef.current;
      editor.redo();
      syncStateFromEditor();
    },
  });

  const submitChanges = useCallback(async () => {
    const editor = editorRef.current;

    if (!editor.haveLocalChanges() || editor.haveSubmittedChanges()) return;

    const changes = editor.submitChanges();

    const submitAcknowledgedRevision = await onSubmitChangesRef.current({
      revision: changes.revision,
      changeset: changes.changeset.serialize(),
    });
    if (submitAcknowledgedRevision == null) return;

    editor.submittedChangesAcknowledged(submitAcknowledgedRevision);
  }, []);

  const syncStateFromEditor = useCallback((isExternalChange = false) => {
    const editor = editorRef.current;
    const value = editor.value;
    const selectionStart = editor.selectionStart;
    const selectionEnd = editor.selectionEnd;
    const selectionDirection = asInputDirection(editor.selectionDirection);

    setState((prev) => {
      if (
        prev.value === value &&
        prev.selectionStart === selectionStart &&
        prev.selectionEnd === selectionEnd &&
        prev.selectionDirection === selectionDirection
      ) {
        return prev;
      }

      return {
        value,
        selectionStart,
        selectionEnd,
        selectionDirection,
      };
    });

    if (
      !isExternalChange &&
      editor.haveLocalChanges() &&
      !editor.haveSubmittedChanges()
    ) {
      onCanSubmitLocalChangesRef.current?.();
    }
  }, []);

  const syncEditorSelectionFromInput = useCallback(() => {
    const input = inputRef.current;
    if (!input?.selectionStart || !input.selectionEnd) return;

    const editor = editorRef.current;

    const startOffset = editor.selectionStart - latestInputSelectionRef.current.start;
    const endOffset = editor.selectionEnd - latestInputSelectionRef.current.end;

    editor.setSelectionRange(
      input.selectionStart + startOffset,
      input.selectionEnd + endOffset,
      asEditorDirection(input.selectionDirection)
    );
  }, []);

  const handleExternalChange = useCallback(
    (serializedChange: SerializedRevisionChangeset) => {
      const editor = editorRef.current;
      if (editor.documentRevision < serializedChange.revision) {
        const change = {
          revision: serializedChange.revision,
          changeset: Changeset.parseValue(serializedChange.changeset),
        };

        syncEditorSelectionFromInput();

        editor.handleExternalChange(change);

        syncStateFromEditor(true);
      }
    },
    [syncStateFromEditor, syncEditorSelectionFromInput]
  );

  return {
    inputRef,
    value: state.value,
    revision: editorRef.current.documentRevision,
    submitChanges,
    haveLocalChanges() {
      return editorRef.current.haveLocalChanges();
    },
    handleSelect,
    handleInput,
    handleExternalChange,
  };
}
