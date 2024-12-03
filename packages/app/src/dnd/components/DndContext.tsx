import {
  rectIntersection,
  useSensors,
  useSensor,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  DndContext as DndKitDndContext,
} from '@dnd-kit/core';
import { Portal } from '@mui/material';
import { ReactNode } from 'react';

import { coordinateGetter as multipleContainersCoordinateGetter } from '../utils/multiple-containers-keyboard-coordinates';

import { DndDataDragOverlay } from './DataRefDragOverlay';
import { OnDragCursorGrab } from './OnDragCursorGrab';

export function DndContext({ children }: { children: ReactNode }) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 5 pixels before activating
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 250ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: multipleContainersCoordinateGetter,
    })
  );

  return (
    <DndKitDndContext sensors={sensors} collisionDetection={rectIntersection}>
      {children}
      <Portal>
        {/* TODO fix scroll appearing with portal */}
        <OnDragCursorGrab>
          <DndDataDragOverlay />
        </OnDragCursorGrab>
      </Portal>
    </DndKitDndContext>
  );
}
