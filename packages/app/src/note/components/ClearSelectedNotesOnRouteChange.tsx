import { useRouter } from '@tanstack/react-router';

import { useEffect } from 'react';

import { useSelectedNoteIdsModel } from '../context/selected-note-ids';

export function ClearSelectedNotesOnRouteChange() {
  const router = useRouter();
  const selectedNoteIdsModel = useSelectedNoteIdsModel();

  useEffect(() => {
    return router.subscribe('onLoad', () => {
      selectedNoteIdsModel.clear();
    });
  }, [router, selectedNoteIdsModel]);

  return null;
}
