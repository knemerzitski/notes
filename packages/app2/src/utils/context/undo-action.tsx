import { createContext, ReactNode, useContext } from 'react';

interface UndoActionOptions {
  /**
   * How long is undo action available in milliseconds
   * @default 10_000
   */
  duration?: number;
}

type UndoClosure = () => void;
export type UndoActionClosure = (
  message: string,
  undo: UndoClosure,
  options?: UndoActionOptions
) => void;

const UndoActionContext = createContext<UndoActionClosure>(() => {
  // do nothing
});

export function useUndoAction(): UndoActionClosure {
  return useContext(UndoActionContext);
}

export function UndoActionProvider({
  onUndoAction,
  children,
}: {
  onUndoAction: UndoActionClosure;
  children: ReactNode;
}) {
  return (
    <UndoActionContext.Provider value={onUndoAction}>
      {children}
    </UndoActionContext.Provider>
  );
}
