import { useEffect } from 'react';
import { useDebouncedCallback, Options } from 'use-debounce';
import { CollabEditor } from '~collab/client/collab-editor';

import useCollabEditor from '../hooks/useCollabEditor';

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

export default function LocalChangesToSubmittedRecordDebounced({
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
    return editor.eventBus.on('haveLocalChanges', () => {
      if (canSubmit(editor)) {
        debouncedSubmitChanges();
      }
    });
  }, [editor, debouncedSubmitChanges]);

  useEffect(() => {
    return editor.eventBus.on('submittedChangesAcknowledged', () => {
      if (canSubmit(editor)) {
        debouncedSubmitChanges();
      }
    });
  }, [editor, debouncedSubmitChanges]);

  return null;
}
