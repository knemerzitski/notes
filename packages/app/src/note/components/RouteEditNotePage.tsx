import { useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';

import { OriginalLocation } from '../../routes/note';
import { useIsMobile } from '../../theme/context/is-mobile';
import { useGetCanGoBack } from '../../router/context/get-can-go-back';
import { OnCloseProvider } from '../../utils/context/on-close';

import { useNoteId } from '../context/note-id';

import { EditNotePage, EditNotePageProps } from './EditNotePage';
import { RedirectToDesktopNote } from './RedirectToDesktopNote';

export function RouteEditNotePage({
  originalLocation,
  EditNotePageProps,
}: {
  originalLocation?: OriginalLocation;
  EditNotePageProps?: EditNotePageProps;
}) {
  const noteId = useNoteId();

  const navigate = useNavigate();

  const isMobile = useIsMobile();

  const router = useRouter();
  const getCanGoBack = useGetCanGoBack();

  const handleClose = useCallback(() => {
    if (getCanGoBack()) {
      router.history.back();
    } else {
      // must not have search on mobile
      if (originalLocation) {
        void navigate({
          to: originalLocation.pathname,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          search: !isMobile && (originalLocation.search as any),
          replace: true,
        });
      } else {
        void navigate({
          to: '/notes',
          replace: true,
        });
      }
    }
  }, [navigate, originalLocation, router, getCanGoBack, isMobile]);

  if (!isMobile) {
    // On desktop show a modal instead: ...?noteId=$noteId
    return <RedirectToDesktopNote noteId={noteId} originalLocation={originalLocation} />;
  }

  return (
    <OnCloseProvider onClose={handleClose}>
      <EditNotePage {...EditNotePageProps} />
    </OnCloseProvider>
  );
}
