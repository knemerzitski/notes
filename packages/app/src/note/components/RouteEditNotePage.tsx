import { useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';

import { OriginalLocation } from '../../routes/note';
import { useIsMobile } from '../../theme/context/is-mobile';
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

  const handleClose = useCallback(() => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      if (originalLocation) {
        void navigate({
          to: originalLocation.pathname,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          search: originalLocation.search as any,
          replace: true,
        });
      } else {
        void navigate({
          to: '/notes',
          replace: true,
        });
      }
    }
  }, [navigate, originalLocation, router]);

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
