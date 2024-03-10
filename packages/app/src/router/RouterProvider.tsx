import { createContext, useContext } from 'react';
import {
  IndexRouteObject,
  NonIndexRouteObject,
  RouterProviderProps,
  createBrowserRouter,
  RouterProvider as DomRouterProvider,
} from 'react-router-dom';

import SessionSynchronization from '../local-state/session/components/SessionSynchronization';
import { SessionSwitcherProvider } from '../local-state/session/hooks/useSwitchToSession';
import ErrorPage from '../routes/ErrorPage';
import RoutesStructure from '../routes/RoutesStructure';

import { PreviousLocationProvider } from './hooks/usePreviousLocation';
import sessionPrefix from './sessionPrefix';

interface CustomIndexRouteObject extends IndexRouteObject {
  readonly backgroundPath?: string;
}
interface CustomNonIndexRouteObject extends NonIndexRouteObject {
  readonly backgroundPath?: string;
  children?: ExtendedRouteObject[];
}

type ExtendedRouteObject = CustomIndexRouteObject | CustomNonIndexRouteObject;

const router = createBrowserRouter([
  ...[`/${sessionPrefix}/:sessionIndex/*`, '*'].map((path) => ({
    path,
    element: (
      <SessionSwitcherProvider>
        <PreviousLocationProvider>
          <SessionSynchronization />
          <RoutesStructure />
        </PreviousLocationProvider>
      </SessionSwitcherProvider>
    ),
    errorElement: <ErrorPage />,
  })),
]);

const modalRoutes: ExtendedRouteObject[] = [
  {
    path: `/${sessionPrefix}?/:sessionIndex?/*`,
    children: [
      {
        path: 'note/:id',
        backgroundPath: '/',
      },
      {
        path: 'local/note/:id',
        backgroundPath: '/local',
      },
    ],
  },
];

const RouterContext = createContext<{
  router: RouterProviderProps['router'];
  modalRoutes: typeof modalRoutes;
} | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useRouter() {
  const ctx = useContext(RouterContext);
  if (ctx === null) {
    throw new Error('useRouter() requires context <RouterProvider>');
  }
  return ctx;
}

export default function RouterProvider() {
  return (
    <RouterContext.Provider value={{ router, modalRoutes }}>
      <DomRouterProvider router={router} />
    </RouterContext.Provider>
  );
}
