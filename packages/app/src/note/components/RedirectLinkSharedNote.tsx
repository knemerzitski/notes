import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useCreateNoteLinkByShareAccess } from '../hooks/useCreateNoteLinkByShareAccess';
import {
  CreateNoteLinkByShareAccessPayloadFragmentDoc,
  NoteShareAccess,
} from '../../__generated__/graphql';
import { getFragmentData } from '../../__generated__';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';

export function RedirectLinkSharedNote({ shareId }: { shareId: NoteShareAccess['id'] }) {
  const navigate = useNavigate();
  const createNoteLinkByShareAccess = useCreateNoteLinkByShareAccess();

  const isLocalOnlyUser = useIsLocalOnlyUser();

  const fetchingRef = useRef(false);

  useEffect(() => {
    if (isLocalOnlyUser) {
      // Local user cannot access shared note
      void navigate({
        to: '.',
        search: (prev) => ({
          ...prev,
          share: undefined,
        }),
      });
      return;
    }

    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    void createNoteLinkByShareAccess(shareId)
      .then(({ data, errors }) => {
        if (errors && errors.length > 0) {
          // Remove search on error
          void navigate({
            to: '.',
            search: (prev) => ({
              ...prev,
              share: undefined,
            }),
          });
        }

        if (!data) {
          return;
        }

        const { userNoteLink } = getFragmentData(
          CreateNoteLinkByShareAccessPayloadFragmentDoc,
          data.createNoteLinkByShareAccess
        );

        const noteId = userNoteLink.note.id;

        // Show note
        void navigate({
          to: '.',
          search: {
            noteId,
          },
          mask: {
            to: '/note/$noteId',
            params: {
              noteId,
            },
          },
        });
      })
      .finally(() => {
        fetchingRef.current = false;
      });
  }, [shareId, createNoteLinkByShareAccess, navigate, isLocalOnlyUser]);

  return null;
}
