import { useEffect } from 'react';
import { useDebouncedCallback, Options } from 'use-debounce';

import usePersist from '../../apollo-client/hooks/usePersist';
import useBeforeUnload from '../../common/hooks/useBeforeUnload';
import useCollabEditor from '../hooks/useCollabEditor';

interface PersistChangesDebouncedProps {
  collabTextId: string;
  /**
   * @default 1000 milliseconds
   */
  wait?: number;
  options?: Options;
}

export default function PersistChangesDebounced({
  collabTextId,
  wait = 3000,
  options = {
    maxWait: 10000,
  },
}: PersistChangesDebouncedProps) {
  const editor = useCollabEditor(collabTextId);

  const persist = usePersist();

  const debouncedPersist = useDebouncedCallback(
    async () => {
      await persist();
    },
    wait,
    options
  );

  // Prevent leaving while having unsaved changes
  useBeforeUnload((e) => {
    if (debouncedPersist.isPending()) {
      e.preventDefault();
      debouncedPersist.flush();
    }
  });

  useEffect(() => {
    return editor.eventBus.on('appliedTypingOperation', () => {
      void debouncedPersist();
    });
  }, [editor, debouncedPersist]);

  return null;
}
