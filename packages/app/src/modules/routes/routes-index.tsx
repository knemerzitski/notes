import { Route, Routes, RoutesProps, createBrowserRouter } from 'react-router-dom';

import { SessionSynchronization } from '../auth/components/session-synchronization';
import { useIsSignedIn } from '../auth/hooks/use-is-signedin';
import { NavigateSwitchCurrentUserProvider } from '../auth/hooks/use-navigate-switch-current-user';
import { RouteSnackbarAlertProvider } from '../common/components/route-snackbar-alert-provider';
import { useIsMobile } from '../common/hooks/use-is-mobile';
import { ModalBackgroundRouting } from '../router/components/modal-background-routing';
import { LocationPrefixProvider } from '../router/context/location-prefix-provider';
import { PreviousLocationProvider } from '../router/hooks/use-previous-location';

import { AppBarDrawerLayout } from './@layouts/appbar-drawer/app-bar-drawer-layout';
import { ArchivedNotesRoute } from './archive/archived-notes-route';
import { ErrorPage } from './error-page';
import { EditNoteDialogRoute as LocalEditNoteDialogRoute } from './local/note/(desktop)/edit-note-dialog-route';
import { EditNotePage as LocalEditNotePage } from './local/note/(mobile)/edit-note-page';
import { NotesRoute as LocalNotesRoute } from './local/notes-route';
import { NotFoundPage } from './not-found-page';
import { EditNoteDialogRoute } from './note/(desktop)/edit-note-dialog-route';
import { EditNotePage } from './note/(mobile)/edit-note-page';
import { NotesRoute } from './notes-route';
import { RedirectSharedNote } from './redirect-shared-note';

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

export function RoutesIndex() {
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
          {isSignedIn && <Route path="archive" element={<ArchivedNotesRoute />} />}
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
