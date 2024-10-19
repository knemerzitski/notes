import { createContext, ReactNode, useCallback, useContext } from 'react';

export interface ShowMessageOptions {
  /**
   * @default 'info'
   */
  severity?: 'success' | 'info' | 'warning' | 'error';
  /**
   * Called when message is no longer shown to user.
   * User might never see the message if it was a duplicate.
   */
  onDone?: () => void;
}

export type ShowMessageClosure<T = ShowMessageOptions> = (
  message: string,
  options?: T
) => void;

const ShowMessageContext = createContext<ShowMessageClosure>(() => {
  // do nothing
});
const ShowErrorContext = createContext<
  ShowMessageClosure<Omit<ShowMessageOptions, 'severity'>>
>(() => {
  // do nothing
});
const ShowWarningContext = createContext<
  ShowMessageClosure<Omit<ShowMessageOptions, 'severity'>>
>(() => {
  // do nothing
});

export function useShowMessage(): ShowMessageClosure {
  return useContext(ShowMessageContext);
}

export function useShowError(): ShowMessageClosure {
  return useContext(ShowErrorContext);
}

export function useShowWarning(): ShowMessageClosure {
  return useContext(ShowWarningContext);
}

export function ShowMessageProvider({
  onMessage,
  children,
}: {
  onMessage: ShowMessageClosure;
  children: ReactNode;
}) {
  const handleError: ShowMessageClosure = useCallback(
    (message, options) => {
      onMessage(message, {
        ...options,
        severity: 'error',
      });
    },
    [onMessage]
  );

  const handleWarning: ShowMessageClosure = useCallback(
    (message, options) => {
      onMessage(message, {
        ...options,
        severity: 'warning',
      });
    },
    [onMessage]
  );

  return (
    <ShowMessageContext.Provider value={onMessage}>
      <ShowErrorContext.Provider value={handleError}>
        <ShowWarningContext.Provider value={handleWarning}>
          {children}
        </ShowWarningContext.Provider>
      </ShowErrorContext.Provider>
    </ShowMessageContext.Provider>
  );
}
