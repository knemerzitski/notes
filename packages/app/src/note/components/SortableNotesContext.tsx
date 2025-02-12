import { UniqueIdentifier, useDndMonitor } from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { ReactNode } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { ListAnchorPosition, Note, NoteCategory } from '../../__generated__/graphql';

import { DndType } from '../../dnd/types';
import { getDndData } from '../../dnd/utils/dnd-data';
import { getNoteDndId } from '../../dnd/utils/id';
import { NoteIdsProvider, useNoteIds } from '../context/note-ids';
import { useSelectedNoteIdsModel } from '../context/selected-note-ids';
import { useIsAnyNoteSelected } from '../hooks/useIsAnyNoteSelected';
import { useMoveNote } from '../hooks/useMoveNote';

import { toMovableNoteCategory } from '../utils/note-category';

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

  const [isDraggingNote, setIsDraggingNote] = useState(false);

  function isValidNoteDndId(id: UniqueIdentifier) {
    return noteDndIds.includes(String(id));
  }

  useDndMonitor({
    onDragPending: ({ id }) => {
      if (isValidNoteDndId(id)) {
        setIsDraggingNote(true);
      }
    },
    onDragAbort: ({ id }) => {
      if (isValidNoteDndId(id)) {
        setIsDraggingNote(false);
      }
    },
    onDragEnd({ active, over, delta }) {
      if (isValidNoteDndId(active.id)) {
        setIsDraggingNote(false);
      }

      const activeNoteDndData = getDndData(active.data);
      if (activeNoteDndData?.type !== DndType.NOTE) {
        // Active not note
        return;
      }
      const { noteId: activeNoteId } = activeNoteDndData;

      if (active.id === over?.id) {
        const didDrag = delta.x > 0 || delta.y > 0;
        if (didDrag) {
          const isOnlyActiveSelected =
            selectedNoteIdsModel.has(activeNoteId) &&
            selectedNoteIdsModel.getAll().length === 1;
          if (isOnlyActiveSelected) {
            // Clear select when over nothing and drag has ended
            selectedNoteIdsModel.clear();
          }
        }

        return;
      }

      const movableCategory = toMovableNoteCategory(category);
      if (!movableCategory) {
        // Cannot reorder notes in non-movable category
        return;
      }

      if (!over) {
        return;
      }

      selectedNoteIdsModel.clear();

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
    <SortableContextDisabledWhenAnyNoteIsSelected
      noteDndIds={noteDndIds}
      isDraggingNote={isDraggingNote}
    >
      <NoteIdsProvider noteIds={noteIds}>{children}</NoteIdsProvider>
    </SortableContextDisabledWhenAnyNoteIsSelected>
  );
}

function SortableContextDisabledWhenAnyNoteIsSelected({
  children,
  noteDndIds,
  isDraggingNote,
}: {
  isDraggingNote: boolean;
  noteDndIds: string[];
  children: ReactNode;
}) {
  const isAnyNoteSelected = useIsAnyNoteSelected();

  const disableDnd = isAnyNoteSelected && !isDraggingNote;

  return (
    <SortableContext
      items={noteDndIds}
      strategy={rectSortingStrategy}
      disabled={disableDnd}
    >
      {children}
    </SortableContext>
  );
}
