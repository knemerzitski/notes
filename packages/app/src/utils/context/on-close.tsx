import { createContext, ReactNode, useContext } from 'react';

type CloseHandler = () => void;

const OnCloseContext = createContext<CloseHandler>(() => {
  // do nothing
});

/**
 * @returns Parent onClose handler
 */
export function useOnClose(): CloseHandler {
  return useContext(OnCloseContext);
}

export function OnCloseProvider({
  onClose,
  children,
}: {
  onClose: CloseHandler;
  children: ReactNode;
}) {
  return <OnCloseContext.Provider value={onClose}>{children}</OnCloseContext.Provider>;
}
