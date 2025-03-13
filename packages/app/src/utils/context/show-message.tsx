import { createContext, ReactNode, useCallback, useContext } from 'react';

export interface ShowMessageOptions {
  /**
   * @default 'info'
   */
  severity?: 'success' | 'info' | 'warning' | 'error';
  /**
   * Invoked when message is visible to user.
   */
  onShowing?: () => void;
  /**
   * Invoked when message is no longer shown to user.
   * Message might have not been shown if it was a duplicated.
   */
  onDone?: () => void;
}

export type ShowMessageClosure<T = ShowMessageOptions> = (
  message: string,
  options?: T
) => () => void;

const ShowMessageContext = createContext<ShowMessageClosure>(() => {
  // do nothing
  return () => {
    //
  };
});
const ShowErrorContext = createContext<
  ShowMessageClosure<Omit<ShowMessageOptions, 'severity'>>
>(() => {
  // do nothing
  return () => {
    //
  };
});
const ShowWarningContext = createContext<
  ShowMessageClosure<Omit<ShowMessageOptions, 'severity'>>
>(() => {
  // do nothing
  return () => {
    //
  };
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
    (message, options) =>
      onMessage(message, {
        ...options,
        severity: 'error',
      }),
    [onMessage]
  );

  const handleWarning: ShowMessageClosure = useCallback(
    (message, options) =>
      onMessage(message, {
        ...options,
        severity: 'warning',
      }),
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
