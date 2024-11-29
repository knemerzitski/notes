import { createContext, ReactNode, useContext } from 'react';

interface UndoActionOptions {
  /**
   * How long is undo action available in milliseconds
   * @default 10_000
   */
  duration?: number;
  /**
   * Key to uniquely identify undo action
   */
  key?: string;
  /**
   * Action is removed and is no longer displayed to the user.
   */
  onRemoved?: () => void;
}

type CloseUndoClosure = () => void;
type UndoClosure = () => void;
export type UndoActionClosure = (
  message: string,
  undo: UndoClosure,
  options?: UndoActionOptions
) => CloseUndoClosure;

const UndoActionContext = createContext<UndoActionClosure>(() => {
  return () => {
    // do nothing
  };
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
