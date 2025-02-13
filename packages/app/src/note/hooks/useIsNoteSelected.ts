import { useEffect, useState } from 'react';

import { Note } from '../../__generated__/graphql';
import { useSelectedNoteIdsModel } from '../context/selected-note-ids';

export function useIsNoteSelected(noteId: Note['id']) {
  const selectedNoteIdsModel = useSelectedNoteIdsModel();
  const [isSelected, setIsSelected] = useState(() =>
    selectedNoteIdsModel.getAll().includes(noteId)
  );

  useEffect(
    () =>
      selectedNoteIdsModel.eventBus.on('added', ({ id }) => {
        if (id === noteId) {
          setIsSelected(true);
        }
      }),
    [noteId, selectedNoteIdsModel]
  );

  useEffect(
    () =>
      selectedNoteIdsModel.eventBus.on('removed', ({ id }) => {
        if (id === noteId) {
          setIsSelected(false);
        }
      }),
    [noteId, selectedNoteIdsModel]
  );

  return isSelected;
}
