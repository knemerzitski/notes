import {
  ReactNode,
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useRef,
} from 'react';

import { IsOpenProvider } from './is-open';
import { OnCloseProvider } from './on-close';
import { OnExitedProvider } from './on-exited';

/**
 * Closes the modal
 */
export type CloseHandler = () => void;

export type ShowModalClosure = (modal: Modal, options?: ShowModalOptions) => CloseHandler;

const ShowModalContext = createContext<ShowModalClosure | null>(null);

export function useShowModal() {
  const ctx = useContext(ShowModalContext);
  if (ctx === null) {
    throw new Error('useShowModal() requires context <SerialModalsProvider>');
  }
  return ctx;
}

export interface ShowModalOptions {
  /**
   * Show this modal immediately interrupting any already shown modals
   * @default false
   */
  immediate?: boolean;

  /**
   * This modal cannot be interrupted by another modal
   * @default false
   */
  uninterruptible?: boolean;
  /**
   * Unique key that allows it to distinguish it from other modals and prevent
   * from showing same type of modal multiple times
   */
  key?: string;
  /**
   * How many times can this modal reappear if it was interruped by another modal
   */
  maxShowCount?: number;
  /**
   * Invoked when modal is visible to the user
   */
  onShowing?: () => void;
  /**
   * Invoked when modal is a duplicate and won't be shown
   */
  onDuplicate?: () => void;
  /**
   * Invoked when modal is removed from queue. Is invoked regardless if modal was shown or not.
   */
  onRemoved?: () => void;
}

type Modal = ReactNode;

interface ModalState {
  readonly modal: Modal;
  /**
   * Status allows modal to have open/close animations
   */
  readonly status: 'ready' | 'showing' | 'closing';
  readonly remainingShowCount: number;
  readonly uninterruptible: boolean;
  readonly immediate: boolean;
  readonly key?: string;
  readonly ignoreOnRemoved?: boolean;
  readonly onRemoved?: () => void;
  readonly onShowing?: () => void;
  readonly onInterrupted?: () => void;
}

/**
 * Keeps track of modals in a queue and shows them one at a time
 */
export function SerialModalsProvider({
  children,
  defaultMaxShowCount = 2,
}: {
  children: ReactNode;
  /**
   * How many times can same modal be shown. Another modal might forcibly close an active one.
   * Forcibly closed modals are requeued. This count limits how many times those modals reshown.
   * @default 2
   */
  defaultMaxShowCount?: number;
}) {
  const [queue, setQueue] = useState<readonly ModalState[]>([]);
  const isActiveOpenRef = useRef(false);

  const active = queue[0];
  const open = active?.status === 'showing';
  isActiveOpenRef.current = open;

  useEffect(() => {
    const first = queue[0];
    if (!first) {
      return;
    }

    // Start showing a ready modal
    if (first.status === 'ready') {
      setQueue((prev) => updateStatusShowing(prev, defaultMaxShowCount));
    }
  }, [queue, defaultMaxShowCount]);

  useEffect(() => {
    if (active?.status !== 'showing') {
      return;
    }

    active.onShowing?.();
  }, [active]);

  const handleModalClose = useCallback(() => {
    // Starts modal closing animation
    setQueue((prev) => updateStatusClosing(prev));
  }, []);

  const handleModalExited = useCallback(() => {
    // Modal is no longer visible and has been shown, remove it
    setQueue((prev) => {
      const active = prev[0];
      if (active && !active.ignoreOnRemoved) {
        active.onRemoved?.();
      }
      return prev.slice(1);
    });
  }, []);

  const showModal: ShowModalClosure = useCallback(
    (newModal, options) => {
      setQueue((prev) => {
        const next = addToQueue(
          {
            modal: newModal,
            status: 'ready',
            remainingShowCount: options?.maxShowCount ?? defaultMaxShowCount,
            uninterruptible: options?.uninterruptible ?? false,
            immediate: options?.immediate ?? false,
            key: options?.key,
            onShowing: options?.onShowing,
            onRemoved: options?.onRemoved,
          },
          prev,
          isActiveOpenRef.current
        );
        const wasNewModalAdded = prev !== next;

        if (!wasNewModalAdded) {
          options?.onDuplicate?.();
        }

        return next;
      });

      return () => {
        setQueue((prev) => removeByModal(newModal, prev, isActiveOpenRef.current));
      };
    },
    [defaultMaxShowCount]
  );

  return (
    <>
      <ShowModalContext.Provider value={showModal}>{children}</ShowModalContext.Provider>

      {active && (
        <IsOpenProvider open={open}>
          <OnExitedProvider onExited={handleModalExited}>
            <OnCloseProvider onClose={handleModalClose}>{active.modal}</OnCloseProvider>
          </OnExitedProvider>
        </IsOpenProvider>
      )}
    </>
  );
}

function updateStatusShowing(
  states: readonly ModalState[],
  maxShowCount: number
): readonly ModalState[] {
  const active = states[0];
  if (!active) {
    return states;
  }

  if (active.remainingShowCount <= 0) {
    return updateStatusShowing(states.slice(1), maxShowCount);
  }

  return [
    {
      ...active,
      status: 'showing',
      remainingShowCount: active.remainingShowCount - 1,
    },
    ...states.slice(1),
  ];
}

function updateStatusClosing(states: readonly ModalState[]): readonly ModalState[] {
  const active = states[0];
  if (!active) {
    return states;
  }

  return [
    {
      ...active,
      status: 'closing',
    },
    ...states.slice(1),
  ];
}

/**
 * @returns Items with {@link newItem}
 */
function addToQueue(
  newItem: ModalState,
  items: readonly ModalState[],
  isActiveOpen: boolean
): readonly ModalState[] {
  if (newItem.key != null) {
    let sameKeyIndex = items.findIndex((item) => item.key === newItem.key);
    if (sameKeyIndex !== -1) {
      if (sameKeyIndex === 0) {
        // Close or remove active
        items = removeByIndex(sameKeyIndex, items, isActiveOpen);
        // Find next same key
        sameKeyIndex = items.findIndex(
          (item, index) => index !== 0 && item.key === newItem.key
        );
        if (sameKeyIndex === -1) {
          // No next same key, add it as next? return value returned by removeByIndex
          return [...items.slice(0, 1), newItem, ...items.slice(1)];
        }
      }

      return [...items.slice(0, sameKeyIndex), newItem, ...items.slice(sameKeyIndex + 1)];
    }
  }

  if (!newItem.immediate) {
    // Push as the last modal shown
    return [...items, newItem];
  }

  // Close current modal immediately and start showing new one
  const active = items[0];
  if (!active) {
    return [newItem];
  }

  // Current modal cannot be interrupted
  if (active.uninterruptible) {
    // Add it after first non-interruptible
    const interruptibleIndex = items.findIndex((item) => !item.uninterruptible);
    if (interruptibleIndex === -1) {
      return [...items, newItem];
    } else {
      return [
        ...items.slice(0, interruptibleIndex),
        newItem,
        ...items.slice(interruptibleIndex),
      ];
    }
  }

  switch (active.status) {
    case 'ready':
      return [newItem, active, ...items.slice(1)];
    case 'closing':
      return [active, newItem, ...items.slice(1)];
    case 'showing':
      return [
        {
          ...active,
          // Do not invoke onRemoved since modal will be shown again later
          ignoreOnRemoved: true,
          status: 'closing',
        },
        newItem,
        {
          ...active,
          status: 'ready',
        },
        ...items.slice(1),
      ];
  }
}

/**
 *
 * @returns Items where `ModalState` with {@link modal} is removed
 */
function removeByModal(
  modal: Modal,
  items: readonly ModalState[],
  isActiveOpen: boolean
): readonly ModalState[] {
  const index = items.findIndex((item) => item.modal === modal);
  return removeByIndex(index, items, isActiveOpen);
}

function removeByIndex(
  index: number,
  items: readonly ModalState[],
  isActiveOpen: boolean
): readonly ModalState[] {
  if (index === -1) {
    return items;
  }
  const item = items[index];
  if (!item) {
    return items;
  }

  const isActive = index === 0;
  const isActiveModalOpen = isActive && isActiveOpen;
  if (isActiveModalOpen) {
    // If modal is active and open (visible) then
    // must update status and not remove from list immediately
    switch (item.status) {
      case 'showing':
        return updateStatusClosing(items);
      case 'closing':
        return items;
    }
  }

  if (!item.ignoreOnRemoved) {
    item.onRemoved?.();
  }

  return [...items.slice(0, index), ...items.slice(index + 1)];
}
