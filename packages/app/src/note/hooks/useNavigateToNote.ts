import { useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';

import { Note } from '../../__generated__/graphql';
import { useIsMobile } from '../../theme/context/is-mobile';

export function useNavigateToNote() {
  const router = useRouter();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return useCallback(
    (
      noteId: Note['id'],
      options?: {
        replace?: boolean;
        maskNoteId?: Note['id'];
        focus?: boolean;
      }
    ) => {
      const originalPathname = router.state.location.pathname;
      const maskNoteId = options?.maskNoteId ?? noteId;

      if (isMobile) {
        // Note page
        return navigate({
          to: '/note/$noteId',
          replace: options?.replace,
          params: {
            noteId,
          },
          search: {
            // Remember originalPathname in case screen is resized and modal needs to be reshown
            originalPathname,
            focus: options?.focus,
          },
          mask: {
            to: '/note/$noteId',
            params: {
              noteId: maskNoteId,
            },
          },
          ignoreBlocker: true,
          viewTransition: false,
        });
      } else {
        // Add noteId to search but mask as /note/$noteId
        return navigate({
          to: '.',
          replace: options?.replace,
          search: (prev) => ({
            ...prev,
            noteId,
            focus: options?.focus,
          }),
          mask: {
            to: '/note/$noteId',
            params: {
              noteId: maskNoteId,
            },
          },
        });
      }
    },
    [navigate, isMobile, router]
  );
}
