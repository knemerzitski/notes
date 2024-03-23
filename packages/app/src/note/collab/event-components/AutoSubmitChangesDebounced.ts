import { useEffect } from 'react';

import { ChangeSource } from '~collab/client/document-client';
import { Events as CollaborativeEditorEvents } from '~collab/editor/collaborative-editor';

import { useSuspenseNoteEditors } from '../context/NoteEditorsProvider';
import useSubmitChangesDebounce, {
  DebounceOptions,
} from '../hooks/useSubmitChangesDebounce';

export interface AutoSubmitChangesDebouncedOptions {
  debounce?: DebounceOptions;
}

export default function AutoSubmitChangesDebounced({
  debounce,
}: AutoSubmitChangesDebouncedOptions) {
  const editors = useSuspenseNoteEditors();

  const submitChangesDebounce = useSubmitChangesDebounce({
    autoContinueSubmit: true,
    debounce,
  });

  useEffect(() => {
    const subs = editors.map(({ value: editor }) => {
      const handleViewChanged: (e: CollaborativeEditorEvents['viewChanged']) => void = ({
        source,
      }) => {
        if (source === ChangeSource.Local && editor.canSubmitChanges()) {
          void submitChangesDebounce();
        }
      };

      editor.eventBus.on('viewChanged', handleViewChanged);

      return { eventBus: editor.eventBus, handler: handleViewChanged };
    });

    return () => {
      subs.forEach(({ eventBus, handler }) => {
        eventBus.off('viewChanged', handler);
      });
    };
  }, [editors, submitChangesDebounce]);

  return null;
}
