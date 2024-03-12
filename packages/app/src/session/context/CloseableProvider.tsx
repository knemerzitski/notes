import { ReactNode, createContext, useContext } from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const CloseableContext = createContext<() => void>(() => {});

// eslint-disable-next-line react-refresh/only-export-components
export function useCloseable() {
  return useContext(CloseableContext);
}
interface SessionProviderProps {
  onClose: () => void;
  children: ReactNode;
}

export default function CloseableProvider({ onClose, children }: SessionProviderProps) {
  return (
    <CloseableContext.Provider value={onClose}>{children}</CloseableContext.Provider>
  );
}
