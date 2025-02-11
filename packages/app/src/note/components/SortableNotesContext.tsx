import { useDndMonitor } from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { ReactNode } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { ListAnchorPosition, Note, NoteCategory } from '../../__generated__/graphql';

import { DndType } from '../../dnd/types';
import { getDndData } from '../../dnd/utils/dnd-data';
import { getNoteDndId } from '../../dnd/utils/id';
import { NoteIdsProvider, useNoteIds } from '../context/note-ids';
import { useMoveNote } from '../hooks/useMoveNote';

import { toMovableNoteCategory } from '../utils/note-category';
import { useSelectedNoteIdsModel } from '../context/selected-note-ids';

export function SortableNotesContext({
  category,
  children,
}: {
  category: NoteCategory;
  children: ReactNode;
}) {
  const parentNoteIds = useNoteIds();

  const [override, setOverride] = useState<{
    parentNoteIds: Note['id'][];
    noteIds: Note['id'][];
  } | null>(null);

  const noteIds =
    override?.parentNoteIds === parentNoteIds ? override.noteIds : parentNoteIds;

  const moveNote = useMoveNote();
  const noteDndIds = useMemo(
    () => noteIds.map((noteId) => getNoteDndId(noteId)),
    [noteIds]
  );

  const selectedNoteIdsModel = useSelectedNoteIdsModel();

  useDndMonitor({
    onDragEnd({ active, over }) {
      if (active.id === over?.id) {
        return;
      }

      selectedNoteIdsModel.clear();

      const movableCategory = toMovableNoteCategory(category);
      if (!movableCategory) {
        // Cannot reorder notes in non-movable category
        return;
      }

      if (!over) {
        // Not over anything
        return;
      }

      const overNoteDndData = getDndData(over.data);
      if (overNoteDndData?.type !== DndType.NOTE) {
        // Over is not note
        return;
      }
      const { noteId: overNoteId } = overNoteDndData;

      const overIndex = noteIds.indexOf(overNoteId);
      if (overIndex === -1) {
        // Over note is not in this list
        return;
      }

      const activeNoteDndData = getDndData(active.data);
      if (activeNoteDndData?.type !== DndType.NOTE) {
        // Active not note
        return;
      }
      const { noteId: activeNoteId } = activeNoteDndData;

      const activeIndex = noteIds.indexOf(activeNoteId);
      if (activeIndex === -1) {
        // Active note is not in this list
        return;
      }

      /**
       * Immediate move feedback for animation since
       * `void moveNote` might not happen in the same tick
       */
      setOverride({
        parentNoteIds,
        noteIds: arrayMove(parentNoteIds, activeIndex, overIndex),
      });

      void moveNote(
        { noteId: activeNoteId },
        {
          anchorNoteId: overNoteId,
          categoryName: movableCategory,
          anchorPosition:
            activeIndex < overIndex
              ? ListAnchorPosition.AFTER
              : ListAnchorPosition.BEFORE,
        }
      );
    },
  });

  return (
    <SortableContext items={noteDndIds} strategy={rectSortingStrategy}>
      <NoteIdsProvider noteIds={noteIds}>{children}</NoteIdsProvider>
    </SortableContext>
  );
}
