import { useEffect } from 'react';
import { useDebouncedCallback, Options } from 'use-debounce';

import { CollabEditor } from '~collab/client/collab-editor';

import { useCollabEditor } from '../hooks/use-collab-editor';

interface LocalChangesToSubmittedRecordDebouncedProps {
  collabTextId: string;
  /**
   * @default 1000 milliseconds
   */
  wait?: number;
  options?: Options;
}

function canSubmit(editor: CollabEditor) {
  return !editor.haveSubmittedChanges() && editor.haveLocalChanges();
}

export function LocalChangesToSubmittedRecordDebounced({
  collabTextId,
  wait = 1000,
  options,
}: LocalChangesToSubmittedRecordDebouncedProps) {
  const editor = useCollabEditor(collabTextId);

  const debouncedSubmitChanges = useDebouncedCallback(
    () => {
      if (canSubmit(editor)) {
        editor.submitChanges();
      }
    },
    wait,
    options
  );

  useEffect(() => {
    function attemptSubmit() {
      if (canSubmit(editor)) {
        debouncedSubmitChanges();
      }
    }

    attemptSubmit();

    return editor.eventBus.onMany(
      ['haveLocalChanges', 'submittedChangesAcknowledged'],
      attemptSubmit
    );
  }, [editor, debouncedSubmitChanges]);

  return null;
}
