import { useRouter } from '@tanstack/react-router';
import { Note } from '../../__generated__/graphql';
import { useEffect, useState } from 'react';

/**
 * Note is open when search query contains `noteId` and equals the parameter {@link noteId}
 * TODO also when at route /note/$noteId
 */
export function useIsNoteOpen(noteId: Note['id']) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(router.state.location.search.noteId === noteId);

  useEffect(() => {
    setIsOpen(router.state.location.search.noteId === noteId);
    return router.subscribe('onLoad', ({ toLocation }) => {
      const searchNoteId = (toLocation.search as Record<string, unknown>).noteId;
      setIsOpen(searchNoteId === noteId);
    });
  }, [router, noteId]);

  return isOpen;
}
