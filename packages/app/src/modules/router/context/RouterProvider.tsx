import { createContext, useContext } from 'react';
import {
  RouterProviderProps,
  RouterProvider as DomRouterProvider,
} from 'react-router-dom';

const RouterContext = createContext<RouterProviderProps['router'] | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useRouter() {
  const ctx = useContext(RouterContext);
  if (ctx === null) {
    throw new Error('useRouter() requires context <RouterProvider>');
  }
  return ctx;
}

export default function RouterProvider({
  router,
}: {
  router: RouterProviderProps['router'];
}) {
  return (
    <RouterContext.Provider value={router}>
      <DomRouterProvider router={router} />
    </RouterContext.Provider>
  );
}
