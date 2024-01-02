import { createContext, useContext } from 'react';
import {
  IndexRouteObject,
  NonIndexRouteObject,
  RouterProviderProps,
  createBrowserRouter,
  RouterProvider as DomRouterProvider,
} from 'react-router-dom';

import SnackbarAlertProvider from '../feedback/SnackbarAlertProvider';
import { SessionSwitcherProvider } from '../apollo/session/context/SessionSwitcherProvider';
import sessionPathnamePrefix from '../apollo/session/pathnamePrefix';

import RootRoute from './RootRoute';
import { PreviousLocationProvider } from './hooks/usePreviousLocation';
import ErrorPage from './pages/ErrorPage';

interface CustomIndexRouteObject extends IndexRouteObject {
  readonly backgroundPath?: string;
}
interface CustomNonIndexRouteObject extends NonIndexRouteObject {
  readonly backgroundPath?: string;
  children?: ExtendedRouteObject[];
}

type ExtendedRouteObject = CustomIndexRouteObject | CustomNonIndexRouteObject;

const router = createBrowserRouter([
  {
    path: `/${sessionPathnamePrefix}?/:sessionIndex?/*`,
    element: (
      <SnackbarAlertProvider>
        <SessionSwitcherProvider>
          <PreviousLocationProvider>
            <RootRoute />
          </PreviousLocationProvider>
        </SessionSwitcherProvider>
      </SnackbarAlertProvider>
    ),
    errorElement: <ErrorPage />,
  },
]);

const modalRoutes: ExtendedRouteObject[] = [
  {
    path: `/${sessionPathnamePrefix}?/:sessionIndex?/*`,
    children: [
      {
        path: 'note/:id',
        backgroundPath: '/',
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
    throw new Error(
      'Error: useRouter() may be used only in the context of a <RouterProvider> component.'
    );
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
