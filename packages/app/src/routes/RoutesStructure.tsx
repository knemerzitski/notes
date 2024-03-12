import { useSuspenseQuery } from '@apollo/client';
import { Route, Routes, RoutesProps } from 'react-router-dom';

import { gql } from '../__generated__/gql';
import useIsMobile from '../hooks/useIsMobile';
import ModalBackgroundRouting from '../router/components/ModalBackgroundRouting';

import AppBarDrawerLayout from './@layouts/appbar-drawer/AppBarDrawerLayout';
import NotFoundPage from './NotFoundPage';
import NotesRoute from './NotesRoute';
import LocalNotesRoute from './local/NotesRoute';
import LocalEditNoteDialogRoute from './local/note/(desktop)/EditNoteDialogRoute';
import LocalEditNotePage from './local/note/(mobile)/EditNotePage';
import EditNoteDialogRoute from './note/(desktop)/EditNoteDialogRoute';

export default function RoutesStructure() {
  const isMobile = useIsMobile();

  return isMobile ? <MobileRoutes /> : <DesktopRoutes />;
}

const QUERY = gql(`
  query RoutesStructure {
    isSignedIn @client
  }
`);

function CommonRoutes({ children, ...restProps }: RoutesProps) {
  const {
    data: { isSignedIn },
  } = useSuspenseQuery(QUERY);

  return (
    <Routes {...restProps}>
      <Route path="*" element={<AppBarDrawerLayout />}>
        <Route index element={isSignedIn ? <NotesRoute /> : <LocalNotesRoute />} />
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
      {/* <Route path="note/:id" element={<EditNotePage />} /> */}
      <Route path="note/:id" element={<EditNoteDialogRoute />} />
      <Route path="local/note/:id" element={<LocalEditNotePage />} />
    </CommonRoutes>
  );
}
