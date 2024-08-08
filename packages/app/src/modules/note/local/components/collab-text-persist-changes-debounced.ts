import { useEffect } from 'react';
import { useDebouncedCallback, Options } from 'use-debounce';

import { usePersist } from '../../../apollo-client/hooks/use-persist';
import { useBeforeUnload } from '../../../common/hooks/use-before-unload';
import { editorsInCache } from '../../../editor/editors';

interface CollabTextPersistChangesDebouncedProps {
  collabTextId: string;
  flushOnUnmount?: boolean;
  /**
   * @default 1000 milliseconds
   */
  wait?: number;
  options?: Options;
}

export function CollabTextPersistChangesDebounced({
  collabTextId,
  flushOnUnmount = false,
  wait = 500,
  options = {
    maxWait: 5000,
  },
}: CollabTextPersistChangesDebouncedProps) {
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
      id: collabTextId,
    }).editor;

    return editor.eventBus.on('appliedTypingOperation', () => {
      void debouncedPersist();
    });
  }, [collabTextId, debouncedPersist]);

  return null;
}
