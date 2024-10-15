import { createContext, ReactNode, useContext } from 'react';

export type ShowErrorClosure = (message: string) => void;

const ShowErrorContext = createContext<ShowErrorClosure>(() => {
  // do nothing
});

export function useShowError(): ShowErrorClosure {
  return useContext(ShowErrorContext);
}

export function ShowErrorProvider({
  onErrorMessage,
  children,
}: {
  onErrorMessage: ShowErrorClosure;
  children: ReactNode;
}) {
  return (
    <ShowErrorContext.Provider value={onErrorMessage}>
      {children}
    </ShowErrorContext.Provider>
  );
}
