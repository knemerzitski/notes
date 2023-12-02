import { createContext, useContext } from 'react';
import {
  IndexRouteObject,
  NonIndexRouteObject,
  RouterProviderProps,
  createBrowserRouter,
  RouterProvider as DomRouterProvider,
} from 'react-router-dom';

import SnackbarAlertProvider from '../components/feedback/SnackbarAlertProvider';
import Root from '../routes/Root';
import ErrorPage from '../routes/pages/ErrorPage';
import { SessionSwitcherProvider } from '../schema/session/components/SessionSwitcherProvider';

import { PreviousLocationProvider } from './usePreviousLocation';

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
    path: '/s?/:sessionIndex?/*',
    element: (
      <SnackbarAlertProvider>
        <SessionSwitcherProvider>
          <PreviousLocationProvider>
            <Root />
          </PreviousLocationProvider>
        </SessionSwitcherProvider>
      </SnackbarAlertProvider>
    ),
    errorElement: <ErrorPage />,
  },
]);

const modalRoutes: ExtendedRouteObject[] = [
  {
    path: '/s?/:sessionIndex?/*',
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
