import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useIsMobile } from '../../theme/context/is-mobile';
import { OnCloseProvider } from '../../utils/context/on-close';
import { RedirectToDesktopNote } from './RedirectToDesktopNote';
import { EditNotePage, EditNotePageProps } from './EditNotePage';
import { useNoteId } from '../context/note-id';

export function RouteEditNotePage({
  originalPathname,
  EditNotePageProps,
}: {
  originalPathname?: string;
  EditNotePageProps?: EditNotePageProps;
}) {
  const noteId = useNoteId();

  const navigate = useNavigate();

  const isMobile = useIsMobile();

  const handleClose = useCallback(() => {
    void navigate({
      to: originalPathname ?? '/notes',
    });
  }, [navigate, originalPathname]);

  if (!isMobile) {
    // On desktop show a modal instead: ...?noteId=$noteId
    return <RedirectToDesktopNote noteId={noteId} originalPathname={originalPathname} />;
  }

  return (
    <OnCloseProvider onClose={handleClose}>
      <EditNotePage {...EditNotePageProps} />
    </OnCloseProvider>
  );
}
