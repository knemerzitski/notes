import { createContext, ReactNode, useContext } from 'react';

export interface ShowConfirmOptions {
  title?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export type ShowConfirmClosure = (message: string, options?: ShowConfirmOptions) => void;

const ShowConfirmContext = createContext<ShowConfirmClosure>(() => {
  // do nothing
});

export function useShowConfirm(): ShowConfirmClosure {
  return useContext(ShowConfirmContext);
}

export function ShowConfirmProvider({
  onConfirm,
  children,
}: {
  onConfirm: ShowConfirmClosure;
  children: ReactNode;
}) {
  return (
    <ShowConfirmContext.Provider value={onConfirm}>
      {children}
    </ShowConfirmContext.Provider>
  );
}
