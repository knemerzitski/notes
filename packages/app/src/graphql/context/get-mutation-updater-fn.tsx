import { createContext, ReactNode, useContext } from 'react';

import { MutationUpdaterFunctionMap } from '../create/mutation-updater-map';

type ProvidedMutationUpdaterFunctionMap = MutationUpdaterFunctionMap['get'];

const MutationUpdateFunctionMapContext = createContext<
  MutationUpdaterFunctionMap['get'] | null
>(null);

export function useGetMutationUpdaterFn(): ProvidedMutationUpdaterFunctionMap {
  const ctx = useContext(MutationUpdateFunctionMapContext);
  if (ctx === null) {
    throw new Error(
      'useGetMutationUpdaterFn() requires context <GetMutationUpdaterFnProvider>'
    );
  }
  return ctx;
}

export function GetMutationUpdaterFnProvider({
  getter,
  children,
}: {
  getter: ProvidedMutationUpdaterFunctionMap;
  children: ReactNode;
}) {
  return (
    <MutationUpdateFunctionMapContext.Provider value={getter}>
      {children}
    </MutationUpdateFunctionMapContext.Provider>
  );
}
