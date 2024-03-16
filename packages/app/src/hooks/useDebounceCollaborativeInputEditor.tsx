import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import {
  Changeset,
  RevisionChangeset,
  SerializedRevisionChangeset,
} from '~collab/changeset/changeset';
import { CollaborativeEditor } from '~collab/editor/collaborative-editor';
import { SelectionDirection } from '~collab/editor/selection-range';

import useClientSyncDebouncedCallback from './useClientSyncDebouncedCallback';
import useInputValueChange from './useInputValueChange';

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

interface DebounceProps {
  wait?: number;
  maxWait?: number;
}

interface UseDebounceCollaborativeInputEditorProps {
  initialHeadText: RevisionChangeset;
  debounce?: DebounceProps;
  submitChanges(
    changes: SerializedRevisionChangeset
  ): Promise<RevisionChangeset['revision'] | undefined>;
}

export default function useDebounceCollaborativeInputEditor({
  initialHeadText,
  debounce,
  submitChanges,
}: UseDebounceCollaborativeInputEditorProps) {
  const editorRef = useRef(
    new CollaborativeEditor({
      headText: initialHeadText,
    })
  );
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

  const { onSelect, onInput } = useInputValueChange({
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

  const submitContentDebounce = useClientSyncDebouncedCallback(
    async () => {
      const editor = editorRef.current;

      if (!editor.haveLocalChanges() || editor.haveSubmittedChanges()) return;

      const changes = editor.submitChanges();

      const submitAcknowledgedRevision = await submitChanges({
        revision: changes.revision,
        changeset: changes.changeset.serialize(),
      });
      if (submitAcknowledgedRevision == null) return;

      editor.submittedChangesAcknowledged(submitAcknowledgedRevision);

      if (editor.haveLocalChanges()) {
        void submitContentDebounce();
      }
    },
    debounce?.wait,
    { maxWait: debounce?.maxWait }
  );

  const syncStateFromEditor = useCallback(
    (skipDebounce = false) => {
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

      if (!skipDebounce && editor.haveLocalChanges() && !editor.haveSubmittedChanges()) {
        void submitContentDebounce();
      }
    },
    [submitContentDebounce]
  );

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

  const onExternalChange = useCallback(
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
    onSelect,
    onInput,
    onExternalChange,
  };
}
