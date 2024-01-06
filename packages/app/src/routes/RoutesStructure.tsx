import { useSuspenseQuery } from '@apollo/client';
import { Route, Routes, RoutesProps } from 'react-router-dom';

import useIsMobile from '../hooks/useIsMobile';
import ModalBackgroundRouting from '../router/components/ModalBackgroundRouting';
import { gql } from '../local-state/__generated__/gql';

import AppBarDrawerLayout from './@layouts/appbar-drawer/AppBarDrawerLayout';
import NotFoundPage from './NotFoundPage';
import NotesRoute from './NotesRoute';
import LocalNotesRoute from './local/NotesRoute';
import LocalEditNoteDialogRoute from './local/note/(desktop)/EditNoteDialogRoute';
import LocalEditNotePage from './local/note/(mobile)/EditNotePage';
import EditNoteDialogRoute from './note/(desktop)/EditNoteDialogRoute';
import EditNotePage from './note/(mobile)/EditNotePage';

export default function RoutesStructure() {
  const isMobile = useIsMobile();

  return isMobile ? <MobileRoutes /> : <DesktopRoutes />;
}

const COMMON_ROUTES_QUERY = gql(`
  query CommonRoutesQuery {
    isLoggedIn @client
  }
`);

function CommonRoutes({ children, ...restProps }: RoutesProps) {
  const {
    data: { isLoggedIn },
  } = useSuspenseQuery(COMMON_ROUTES_QUERY);

  return (
    <Routes {...restProps}>
      <Route path="*" element={<AppBarDrawerLayout />}>
        <Route index element={isLoggedIn ? <NotesRoute /> : <LocalNotesRoute />}/>
        <Route path="local" element={<LocalNotesRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      {children}
    </Routes>
  );
}

function DesktopRoutes() {
  return (
    <ModalBackgroundRouting
      DefaultRoutes={CommonRoutes}
      modalRoutes={
        <Routes>
          <Route path="note/:id" element={<EditNoteDialogRoute />} />
          <Route path="local/note/:id" element={<LocalEditNoteDialogRoute />} />
        </Routes>
      }
    />
  );
}

function MobileRoutes() {
  return (
    <CommonRoutes>
      <Route path="note/:id" element={<EditNotePage />} />
      <Route path="local/note/:id" element={<LocalEditNotePage />} />
    </CommonRoutes>
  );
}
