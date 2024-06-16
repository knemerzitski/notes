import { Route, Routes, RoutesProps, createBrowserRouter } from 'react-router-dom';

import SessionSynchronization from '../auth/components/SessionSynchronization';
import useIsSignedIn from '../auth/hooks/useIsSignedIn';
import { NavigateSwitchCurrentUserProvider } from '../auth/hooks/useNavigateSwitchCurrentUser';
import RouteSnackbarAlertProvider from '../common/components/RouteSnackbarAlertProvider';
import useIsMobile from '../common/hooks/useIsMobile';
import ModalBackgroundRouting from '../router/components/ModalBackgroundRouting';
import LocationPrefixProvider from '../router/context/LocationPrefixProvider';
import { PreviousLocationProvider } from '../router/hooks/usePreviousLocation';

import AppBarDrawerLayout from './@layouts/appbar-drawer/AppBarDrawerLayout';
import ErrorPage from './ErrorPage';
import NotFoundPage from './NotFoundPage';
import NotesRoute from './NotesRoute';
import RedirectSharedNote from './RedirectSharedNote';
import LocalNotesRoute from './local/NotesRoute';
import LocalEditNoteDialogRoute from './local/note/(desktop)/EditNoteDialogRoute';
import LocalEditNotePage from './local/note/(mobile)/EditNotePage';
import EditNoteDialogRoute from './note/(desktop)/EditNoteDialogRoute';
import EditNotePage from './note/(mobile)/EditNotePage';

const currentUserIndex = 'u';

// eslint-disable-next-line react-refresh/only-export-components
export const router = createBrowserRouter([
  ...[`/${currentUserIndex}/:currentUserIndex/*`, '*'].map((path) => ({
    path,
    element: (
      <LocationPrefixProvider prefix={currentUserIndex}>
        <NavigateSwitchCurrentUserProvider>
          <PreviousLocationProvider>
            <SessionSynchronization />
            <RouteSnackbarAlertProvider>
              <RoutesIndex />
            </RouteSnackbarAlertProvider>
          </PreviousLocationProvider>
        </NavigateSwitchCurrentUserProvider>
      </LocationPrefixProvider>
    ),
    errorElement: <ErrorPage />,
  })),
]);

export default function RoutesIndex() {
  const isMobile = useIsMobile();

  return isMobile ? <MobileRoutes /> : <DesktopRoutes />;
}

function CommonRoutes({ children, ...restProps }: RoutesProps) {
  const isSignedIn = useIsSignedIn();

  return (
    <>
      <Routes>
        {/* searchParams: ?share=shareId */}
        <Route index element={<RedirectSharedNote />} />
      </Routes>

      <Routes {...restProps}>
        <Route path="*" element={<AppBarDrawerLayout />}>
          <Route index element={isSignedIn ? <NotesRoute /> : <LocalNotesRoute />} />
          <Route path="local" element={<LocalNotesRoute />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        {children}
      </Routes>
    </>
  );
}

function DesktopRoutes() {
  return (
    <ModalBackgroundRouting
      DefaultRoutes={CommonRoutes}
      modalRoutes={
        <Routes>
          <Route path="note/:id?" element={<EditNoteDialogRoute />} />
          <Route
            path="local/note/:id?"
            element={<LocalEditNoteDialogRoute parentPath="local" />}
          />
        </Routes>
      }
    />
  );
}

function MobileRoutes() {
  return (
    <CommonRoutes>
      <Route path="note/:id?" element={<EditNotePage />} />
      <Route path="local/note/:id?" element={<LocalEditNotePage />} />
    </CommonRoutes>
  );
}
