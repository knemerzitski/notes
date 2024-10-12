import { createContext, ReactNode, useContext } from 'react';
import { UpdateHandlersByName } from '../types';

const UpdateHandlersByNameContext = createContext<UpdateHandlersByName | null>(null);

export function useUpdateHandlersByName(): UpdateHandlersByName {
  const ctx = useContext(UpdateHandlersByNameContext);
  if (ctx === null) {
    throw new Error(
      'useUpdateHandlersByName() requires context <UpdateHandlersByNameProvider>'
    );
  }
  return ctx;
}

export function UpdateHandlersByNameProvider({
  handlers,
  children,
}: {
  handlers: UpdateHandlersByName;
  children: ReactNode;
}) {
  return (
    <UpdateHandlersByNameContext.Provider value={handlers}>
      {children}
    </UpdateHandlersByNameContext.Provider>
  );
}
