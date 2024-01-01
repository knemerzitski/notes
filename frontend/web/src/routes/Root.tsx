import { Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  Route,
  Routes,
  useLocation,
  Location,
  RoutesProps,
  matchRoutes,
} from 'react-router-dom';

import SnackbarErrorBoundary from '../components/feedback/SnackbarErrorBoundary';
import useIsMobile from '../hooks/useIsMobile';
import NotesMain from '../notes/NotesMain';
import { useProxyTransform } from '../router/ProxyRoutesProvider';
import { useRouter } from '../router/RouterProvider';
import usePreviousLocation from '../router/usePreviousLocation';

import EditNoteDialogRoute from './dialog/EditNoteDialog';
import Main from './layout/MainLayout';
import EditNotePage from './pages/EditNotePage';
import NotFoundPage from './pages/NotFoundPage';

export default function Root() {
  const isMobile = useIsMobile();

  return isMobile ? <MobileRoutes /> : <DesktopRoutes />;
}

function CommonRoutes({ children, ...restProps }: RoutesProps) {
  return (
    <Routes {...restProps}>
      <Route path="*" element={<Main />}>
        <Route index element={<NotesMain />} />
        <Route
          path="extra"
          element={
            <>
              test content and <NotesMain />
            </>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      {children}
    </Routes>
  );
}

function MobileRoutes() {
  return (
    <CommonRoutes>
      <Route path="note/:id" element={<EditNotePage />} />
    </CommonRoutes>
  );
}

function ModalRoutes() {
  return (
    <Routes>
      <Route path="note/:id" element={<EditNoteDialogRoute />} />
    </Routes>
  );
}

function DesktopRoutes() {
  return (
    <>
      <MainOrBackgroundRoutes />

      <ErrorBoundary FallbackComponent={SnackbarErrorBoundary}>
        <Suspense fallback={null}>
          <ModalRoutes />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

function MainOrBackgroundRoutes() {
  const pathnameTransform = useProxyTransform();
  const location = useLocation();
  const previousLocation = usePreviousLocation();
  const { modalRoutes } = useRouter();

  //Check if current route is a modal with background location defined
  let modalBackgroundLocation: Location | undefined;
  const matchedModalRoutes = matchRoutes(modalRoutes, location);
  if (matchedModalRoutes && matchedModalRoutes.length > 0) {
    const route = matchedModalRoutes[matchedModalRoutes.length - 1].route;
    if (route.backgroundPath) {
      modalBackgroundLocation = {
        hash: '',
        key: 'default',
        pathname: pathnameTransform(route.backgroundPath),
        search: '',
        state: null,
      };
    }
  }

  // Check if previous route was a modal with background location defined
  let isPreviousLocationModal = false;
  const previousMatchedModalRoutes = previousLocation
    ? matchRoutes(modalRoutes, previousLocation)
    : null;
  if (previousMatchedModalRoutes && previousMatchedModalRoutes.length > 0) {
    const route = previousMatchedModalRoutes[previousMatchedModalRoutes.length - 1].route;
    isPreviousLocationModal = !!route.backgroundPath;
  }

  let mainOrBgLocation = location;
  if (modalBackgroundLocation) {
    if (!isPreviousLocationModal && previousLocation) {
      mainOrBgLocation = previousLocation;
    } else {
      mainOrBgLocation = modalBackgroundLocation;
    }
  }

  const mainOrBgRoutes = useMemo(() => {
    const loc = {
      key: mainOrBgLocation.key,
      pathname: mainOrBgLocation.pathname,
      search: mainOrBgLocation.search,
      hash: mainOrBgLocation.hash,
      state: mainOrBgLocation.state as unknown,
    };
    return <CommonRoutes location={loc} />;
  }, [
    // Memo only values, not location object itself as it can change while values inside are still same
    mainOrBgLocation.pathname,
    mainOrBgLocation.search,
    mainOrBgLocation.hash,
    mainOrBgLocation.state,
    mainOrBgLocation.key,
  ]);

  return mainOrBgRoutes;
}
