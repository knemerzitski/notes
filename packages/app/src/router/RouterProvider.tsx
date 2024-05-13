import { createContext, useContext } from 'react';
import {
  IndexRouteObject,
  NonIndexRouteObject,
  RouterProviderProps,
  createBrowserRouter,
  RouterProvider as DomRouterProvider,
} from 'react-router-dom';

import ErrorPage from '../routes/ErrorPage';
import RoutesStructure from '../routes/RoutesStructure';
import SessionSynchronization from '../session/components/SessionSynchronization';
import { NavigateToSessionProvider } from '../session/hooks/useNavigateToSession';

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

/*ClientSyncStatusProvider PROVIDE: useIsClientSynchronized
	StatsLinkProvider: PROVIDE useStatsLink
		ApolloClientSynchronized USE, useStatsLink
	
	
	

AddFetchResultErrorHandlerProvider PROVIDE: useAddFetchResultErrorHandler
	SessionSynchronization: USE: useAddFetchResultErrorHandler
	ApolloClientErrorsSnackbarAlert USE: useAddFetchResultErrorHandler*/

const router = createBrowserRouter([
  ...[`/${sessionPrefix}/:sessionIndex/*`, '*'].map((path) => ({
    path,
    element: (
      <NavigateToSessionProvider>
        <PreviousLocationProvider>
          <SessionSynchronization />
          <RoutesStructure />
        </PreviousLocationProvider>
      </NavigateToSessionProvider>
    ),
    errorElement: <ErrorPage />,
  })),
]);

const modalRoutes: ExtendedRouteObject[] = [
  {
    path: `/${sessionPrefix}?/:sessionIndex?/*`,
    children: [
      {
        path: 'note/:id?',
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

// TODO pass in router from props?
export default function RouterProvider() {
  return (
    <RouterContext.Provider value={{ router, modalRoutes }}>
      <DomRouterProvider router={router} />
    </RouterContext.Provider>
  );
}
