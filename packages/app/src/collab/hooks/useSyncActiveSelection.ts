import { FormEventHandler, useCallback, useEffect, useRef } from 'react';
import { gql } from '../../__generated__';
import { useApolloClient } from '@apollo/client';

export const FRAGMENT = gql(`
  fragment UseSyncActiveSelection on CollabText {
    activeSelection {
      start
      end
    }
  }
`);

export default function useSyncActiveSelection(collabTextId: string) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionSyncingRef = useRef(false);

  const apolloClient = useApolloClient();

  function syncUpdate(fn: () => void) {
    if (selectionSyncingRef.current) return;
    try {
      selectionSyncingRef.current = true;
      fn();
    } finally {
      selectionSyncingRef.current = false;
    }
  }

  // Watch state
  useEffect(() => {
    const subscription = apolloClient
      .watchFragment({
        from: {
          id: collabTextId,
          __typename: 'CollabText',
        },
        fragment: FRAGMENT,
      })
      .subscribe({
        next(value) {
          const input = inputRef.current;
          if (!input) return;

          syncUpdate(() => {
            const start = value.data.activeSelection?.start ?? null;
            const end = value.data.activeSelection?.end ?? start;
            input.setSelectionRange(start, end);
          });
        },
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [apolloClient, collabTextId]);

  // Watch input
  const handleSelect: FormEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const target = e.target;
      if (
        !(target instanceof HTMLTextAreaElement) &&
        !(target instanceof HTMLInputElement)
      ) {
        return;
      }

      syncUpdate(() => {
        apolloClient.writeFragment({
          id: apolloClient.cache.identify({
            id: collabTextId,
            __typename: 'CollabText',
          }),
          fragment: FRAGMENT,
          data: {
            activeSelection: {
              start: target.selectionStart ?? 0,
              end:
                target.selectionStart !== target.selectionEnd
                  ? target.selectionEnd
                  : null,
            },
          },
        });
      });
    },
    [apolloClient, collabTextId]
  );

  return {
    inputRef,
    handleSelect,
  };
}
