import { useRouter } from '@tanstack/react-router';

import { useEffect, useState } from 'react';

import { Note } from '../../__generated__/graphql';

/**
 * Note sharing dialog is open when search query contains `sharingNoteId` and equals the parameter {@link noteId}
 */
export function useIsNoteSharingOpen(noteId: Note['id']) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(
    router.state.location.search.sharingNoteId === noteId
  );

  useEffect(() => {
    setIsOpen(router.state.location.search.sharingNoteId === noteId);
    return router.subscribe('onLoad', ({ toLocation }) => {
      const searchNoteId = (toLocation.search as Record<string, unknown>).sharingNoteId;
      setIsOpen(searchNoteId === noteId);
    });
  }, [router, noteId]);

  return isOpen;
}
