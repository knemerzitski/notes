import { useEffect, useState } from 'react';

import { useSelectedNoteIdsModel } from '../context/selected-note-ids';

export function useIsAnyNoteSelected() {
  const selectedNoteIdsModel = useSelectedNoteIdsModel();
  const [isAnySelected, setIsAnySelected] = useState(
    () => selectedNoteIdsModel.getAll().length > 0
  );

  useEffect(
    () =>
      selectedNoteIdsModel.eventBus.on('added', () => {
        setIsAnySelected(true);
      }),
    [selectedNoteIdsModel]
  );

  useEffect(
    () =>
      selectedNoteIdsModel.eventBus.on('removed', () => {
        if (selectedNoteIdsModel.getAll().length === 0) {
          setIsAnySelected(false);
        }
      }),
    [selectedNoteIdsModel]
  );

  return isAnySelected;
}
