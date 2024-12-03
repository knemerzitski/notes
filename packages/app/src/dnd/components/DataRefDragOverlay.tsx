import { DataRef, useDndMonitor, DragOverlay } from '@dnd-kit/core';
import { useTheme } from '@mui/material';
import { useState } from 'react';

import { renderDragOverlayFromDndData } from '../utils/data-drag-overlay';

/**
 * Renders overlay component function from item dnd data property
 */
export function DndDataDragOverlay() {
  const theme = useTheme();
  const [activeDataRef, setActiveDataRef] = useState<DataRef | null>(null);

  function dragFinished() {
    setActiveDataRef(null);
  }

  useDndMonitor({
    onDragStart({ active }) {
      setActiveDataRef(active.data);
    },
    onDragEnd() {
      dragFinished();
    },
    onDragCancel() {
      dragFinished();
    },
  });

  return (
    <DragOverlay zIndex={theme.zIndex.drawer}>
      {renderDragOverlayFromDndData(activeDataRef)}
    </DragOverlay>
  );
}
