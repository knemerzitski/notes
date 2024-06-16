import { useEffect } from 'react';
import { useDebouncedCallback, Options } from 'use-debounce';

import usePersist from '../../apollo-client/hooks/usePersist';
import useBeforeUnload from '../../common/hooks/useBeforeUnload';
import { editorsInCache } from '../../editor/editors';

interface LocalCollabTextPersistChangesDebouncedProps {
  localCollabTextId: string;
  flushOnUnmount?: boolean;
  /**
   * @default 1000 milliseconds
   */
  wait?: number;
  options?: Options;
}

export default function LocalCollabTextPersistChangesDebounced({
  localCollabTextId,
  flushOnUnmount = false,
  wait = 500,
  options = {
    maxWait: 5000,
  },
}: LocalCollabTextPersistChangesDebouncedProps) {
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
    return () => {
      if (flushOnUnmount) {
        debouncedPersist.flush();
      }
    };
  }, [debouncedPersist, flushOnUnmount]);

  useEffect(() => {
    const editor = editorsInCache.getOrCreate({
      __typename: 'LocalCollabText',
      id: localCollabTextId,
    }).editor;

    return editor.eventBus.on('appliedTypingOperation', () => {
      void debouncedPersist();
    });
  }, [localCollabTextId, debouncedPersist]);

  return null;
}
