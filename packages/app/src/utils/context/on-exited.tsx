import { createContext, ReactNode, useContext } from 'react';

type ExitedHandler = () => void;

const OnExitedContext = createContext<ExitedHandler>(() => {
  // do nothing
});

/**
 * @returns Parent onExited handler
 */
export function useOnExited(): ExitedHandler {
  return useContext(OnExitedContext);
}

export function OnExitedProvider({
  onExited,
  children,
}: {
  onExited: ExitedHandler;
  children: ReactNode;
}) {
  return <OnExitedContext.Provider value={onExited}>{children}</OnExitedContext.Provider>;
}
