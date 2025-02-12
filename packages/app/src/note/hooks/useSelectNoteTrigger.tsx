import { PointerEvent, useCallback, useRef } from 'react';

import { Note } from '../../__generated__/graphql';
import { useSelectedNoteIdsModel } from '../context/selected-note-ids';

export function useSelectNoteTrigger(
  noteId: Note['id'],
  options?: {
    /**
     * @default 150 milliseconds
     */
    delay?: number;
    /**
     * @default 5 pixels
     */
    tolerance?: number;
  }
) {
  const delay = options?.delay ?? 250;
  const tolerance = options?.tolerance ?? 5;

  const selectedNoteIdsModel = useSelectedNoteIdsModel();

  const isControlledRef = useRef(false);

  const constraintRef = useRef<{
    timeoutId: ReturnType<typeof setTimeout>;
    movementSum: {
      x: number;
      y: number;
    };
  } | null>(null);

  const handlePointerDown = useCallback(
    (_e: PointerEvent<HTMLDivElement>) => {
      clearTimeout(constraintRef.current?.timeoutId);
      constraintRef.current = null;

      function handleTimeout() {
        if (!constraintRef.current) {
          return;
        }

        if (!selectedNoteIdsModel.has(noteId)) {
          selectedNoteIdsModel.add(noteId);
        } else {
          selectedNoteIdsModel.remove(noteId);
          if (selectedNoteIdsModel.getAll().length === 0) {
            isControlledRef.current = true;
            setTimeout(() => {
              isControlledRef.current = false;
            });
          }
        }

        constraintRef.current = null;
      }

      constraintRef.current = {
        timeoutId: setTimeout(handleTimeout, delay),
        movementSum: {
          x: 0,
          y: 0,
        },
      };
    },
    [selectedNoteIdsModel, noteId, delay]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!constraintRef.current) {
        return;
      }

      constraintRef.current.movementSum.x += e.movementX;
      constraintRef.current.movementSum.y += e.movementY;

      const dist = Math.sqrt(
        Math.pow(constraintRef.current.movementSum.x, 2) +
          Math.pow(constraintRef.current.movementSum.y, 2)
      );

      if (dist > tolerance) {
        clearTimeout(constraintRef.current.timeoutId);
        constraintRef.current = null;
      }
    },
    [tolerance]
  );

  const handlePointerUp = useCallback(
    (_e: PointerEvent<HTMLDivElement>) => {
      if (!constraintRef.current) {
        return;
      }

      clearTimeout(constraintRef.current.timeoutId);
      constraintRef.current = null;

      const cancelQuickSelect = selectedNoteIdsModel.getAll().length <= 0;
      if (cancelQuickSelect) {
        return;
      }

      if (!selectedNoteIdsModel.has(noteId)) {
        selectedNoteIdsModel.add(noteId);
      } else {
        selectedNoteIdsModel.remove(noteId);
        if (selectedNoteIdsModel.getAll().length === 0) {
          isControlledRef.current = true;
          setTimeout(() => {
            isControlledRef.current = false;
          });
        }
      }
    },
    [noteId, selectedNoteIdsModel]
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    getIsControlled: () => isControlledRef.current,
  };
}
