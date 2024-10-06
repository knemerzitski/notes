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
  value,
  children,
}: {
  value: UpdateHandlersByName;
  children: ReactNode;
}) {
  return (
    <UpdateHandlersByNameContext.Provider value={value}>
      {children}
    </UpdateHandlersByNameContext.Provider>
  );
}
