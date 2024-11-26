import { forwardRef, useMemo } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { NoteCard } from './NoteCard';
import { useNoteId } from '../context/note-id';
import { setDndData } from '../../dnd/utils/dnd-data';
import { DndType } from '../../dnd/types';
import { css, styled } from '@mui/material';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { getNoteDndId } from '../../dnd/utils/id';
import { setDragOverlayInDndData } from '../../dnd/utils/data-drag-overlay';
import { useSortable } from '@dnd-kit/sortable';
import { DragOverlayNoteCard } from './DragOverlayNoteCard';
import { useIsMobile } from '../../theme/context/is-mobile';

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

  const { setNodeRef, attributes, listeners, isDragging, transform, transition } =
    useSortable({
      id: getNoteDndId(noteId),
      data: dndData,
    });

  return (
    <NoteCardStyled
      ref={(el) => {
        if (typeof ref === 'function') {
          ref(el);
        } else if (ref) {
          ref.current = el;
        }
        setNodeRef(el);
      }}
      sx={{
        // TODO styled
        touchAction: isMobile ? 'manipulation' : undefined,
      }}
      style={{
        ...props.style,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      isDragging={isDragging}
      {...attributes}
      {...listeners}
      tabIndex={0}
      {...props}
    />
  );
});

export const draggingHidden = {
  style: ({ isDragging }: { isDragging: boolean }) => {
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
  shouldForwardProp: mergeShouldForwardProp(draggingHidden.props),
})(draggingHidden.style);
