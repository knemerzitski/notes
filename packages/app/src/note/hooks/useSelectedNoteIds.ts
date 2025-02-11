import { useEffect, useState } from 'react';
import { useSelectedNoteIdsModel } from '../context/selected-note-ids';

export function useSelectedNoteIds() {
  const selectedNoteIdsModel = useSelectedNoteIdsModel();
  const [noteIds, setNoteIds] = useState(selectedNoteIdsModel.getAll());

  useEffect(
    () =>
      selectedNoteIdsModel.eventBus.on('added', () => {
        setNoteIds(selectedNoteIdsModel.getAll());
      }),
    [selectedNoteIdsModel]
  );

  useEffect(
    () =>
      selectedNoteIdsModel.eventBus.on('removed', () => {
        setNoteIds(selectedNoteIdsModel.getAll());
      }),
    [selectedNoteIdsModel]
  );

  return noteIds;
}
