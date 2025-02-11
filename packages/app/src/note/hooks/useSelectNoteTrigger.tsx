import { PointerEvent, useCallback, useRef } from 'react';
import { useSelectedNoteIdsModel } from '../context/selected-note-ids';
import { Note } from '../../__generated__/graphql';

export function useSelectNoteTrigger(
  noteId: Note['id'],
  options?: {
    /**
     * @default 150 milliseconds
     */
    delay?: number;
    /**
     * @default 5 milliseconds
     */
    tolerance?: number;
  }
) {
  const delay = options?.delay ?? 200;
  const tolerance = options?.tolerance ?? 5;

  const selectedNoteIdsModel = useSelectedNoteIdsModel();

  const constraintRef = useRef<{
    timeoutId: ReturnType<typeof setTimeout>;
    downClientX: number;
    downClientY: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      clearTimeout(constraintRef.current?.timeoutId);
      constraintRef.current = null;

      if (selectedNoteIdsModel.getAll().length > 0) {
        // If have selected notes, select faster
        constraintRef.current = {
          timeoutId: setTimeout(() => {
            selectedNoteIdsModel.add(noteId);
          }, delay / 4),
          downClientX: e.clientX,
          downClientY: e.clientY,
        };
      } else {
        // First time select note after a delay
        constraintRef.current = {
          timeoutId: setTimeout(() => {
            selectedNoteIdsModel.add(noteId);
          }, delay),
          downClientX: e.clientX,
          downClientY: e.clientY,
        };
      }
    },
    [selectedNoteIdsModel, noteId, delay]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!constraintRef.current) {
        return;
      }

      const dist = distBetween(
        constraintRef.current.downClientX,
        e.clientX,
        constraintRef.current.downClientY,
        e.clientY
      );

      if (dist > tolerance) {
        clearTimeout(constraintRef.current.timeoutId);
        constraintRef.current = null;
      }
    },
    [tolerance]
  );

  const handlePointerUp = useCallback((_e: PointerEvent<HTMLDivElement>) => {
    clearTimeout(constraintRef.current?.timeoutId);
    constraintRef.current = null;
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  };
}

function distBetween(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}
