import { useRef, useState } from 'react';

import {
  Changeset,
  RevisionChangeset,
  SerializedRevisionChangeset,
} from '~collab/changeset/changeset';
import { CollaborativeEditor } from '~collab/editor/collaborative-editor';
import { SelectionDirection } from '~collab/editor/selection-range';

import useClientSyncDebouncedCallback from './useClientSyncDebouncedCallback';
import useControlledInputSelection from './useControlledInputSelection';
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

  const inputRef = useControlledInputSelection(state);

  const { onSelect, onInput } = useInputValueChange({
    onInsert({ selectionStart, selectionEnd, selectionDirection, insertText }) {
      const editor = editorRef.current;
      editor.setSelectionRange(
        selectionStart,
        selectionEnd,
        asEditorDirection(selectionDirection)
      );
      editor.insertText(insertText);
      syncStateFromEditor();
    },
    onDelete({ selectionStart, selectionEnd, selectionDirection }) {
      const editor = editorRef.current;
      editor.setSelectionRange(
        selectionStart,
        selectionEnd,
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

      if (editor.haveSubmittedChanges()) return;

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

  function syncStateFromEditor(skipDebounce = false) {
    const editor = editorRef.current;
    const selectionDirection = asInputDirection(editor.selectionDirection);
    const stateChanged =
      state.value !== editor.value ||
      state.selectionStart !== editor.selectionStart ||
      state.selectionEnd !== editor.selectionEnd ||
      state.selectionDirection !== selectionDirection;
    if (stateChanged) {
      setState({
        value: editor.value,
        selectionStart: editor.selectionStart,
        selectionEnd: editor.selectionEnd,
        selectionDirection,
      });
    }
    if (!skipDebounce && !editor.haveSubmittedChanges()) {
      void submitContentDebounce();
    }
  }

  function onExternalChange(changes: SerializedRevisionChangeset) {
    const editor = editorRef.current;
    if (editor.documentRevision < changes.revision) {
      const inputEl = inputRef.current;
      if (inputEl) {
        // Sync input selection to editor selection before processing external change
        editor.setSelectionRange(
          inputEl.selectionStart ?? editor.selectionStart,
          inputEl.selectionEnd ?? editor.selectionEnd,
          asEditorDirection(inputEl.selectionDirection)
        );
      }
      editor.handleExternalChange({
        revision: changes.revision,
        changeset: Changeset.parseValue(changes.changeset),
      });
      syncStateFromEditor(true);
    }
  }

  return {
    inputRef,
    value: state.value,
    revision: editorRef.current.documentRevision,
    onSelect,
    onInput,
    onExternalChange,
  };
}
