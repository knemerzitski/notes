import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { css, styled } from '@mui/material';
import { forwardRef, useMemo } from 'react';

import { DndType } from '../../dnd/types';

import { setDragOverlayInDndData } from '../../dnd/utils/data-drag-overlay';
import { setDndData } from '../../dnd/utils/dnd-data';
import { getNoteDndId } from '../../dnd/utils/id';

import { useIsMobile } from '../../theme/context/is-mobile';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { useNoteId } from '../context/note-id';

import { DragOverlayNoteCard } from './DragOverlayNoteCard';
import { NoteCard, PureNoteCard } from './NoteCard';

export const SortableNoteCard = forwardRef<
  HTMLDivElement,
  Parameters<typeof NoteCard>[0]
>(function SortableNoteCard(props, ref) {
  const noteId = useNoteId();
  const isMobile = useIsMobile();

  const dndData = useMemo(() => {
    let data = setDragOverlayInDndData({
      element: <DragOverlayNoteCard noteId={noteId} />,
    });

    data = setDndData(
      {
        type: DndType.NOTE,
        noteId,
      },
      data
    );

    return data;
  }, [noteId]);

  const {
    setNodeRef,
    attributes,
    listeners,
    isDragging,
    transform,
    transition,
    isSorting,
  } = useSortable({
    id: getNoteDndId(noteId),
    data: dndData,
  });

  function refFn(el: HTMLDivElement | null) {
    if (typeof ref === 'function') {
      ref(el);
    } else if (ref) {
      ref.current = el;
    }
    setNodeRef(el);
  }

  if (isSorting) {
    return (
      <PureNoteCardStyled
        ref={refFn}
        style={{
          ...props.style,
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        {...attributes}
        {...listeners}
        {...props}
        isDragging={isDragging}
      />
    );
  }

  return (
    <NoteCardStyled
      ref={refFn}
      {...attributes}
      {...listeners}
      tabIndex={0}
      {...props}
      isMobile={isMobile}
    />
  );
});

export const mobileManipulation = {
  style: ({ isMobile }: { isMobile: boolean }) => {
    if (isMobile) {
      return css`
        touch-action: manipulation;
      `;
    }

    return;
  },
  props: ['isMobile'],
};

export const draggingHidden = {
  style: ({ isDragging = false }: { isDragging?: boolean }) => {
    if (isDragging) {
      return css`
        visibility: hidden;
      `;
    }

    return;
  },
  props: ['isDragging'],
};

const NoteCardStyled = styled(NoteCard, {
  shouldForwardProp: mergeShouldForwardProp(mobileManipulation.props),
})<{ isDragging?: boolean; isMobile: boolean }>(mobileManipulation.style);

const PureNoteCardStyled = styled(PureNoteCard, {
  shouldForwardProp: mergeShouldForwardProp(draggingHidden.props),
})<{ isDragging?: boolean }>(draggingHidden.style);
