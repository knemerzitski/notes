import { WritableDraft } from 'immer';

import { Context, Properties, State } from '../types';

// maxSize: number, deletionThreshold: number
export function cleanupUndoStack(
  props: Pick<Properties, 'serverFacades'> & {
    readonly context: Pick<Context, 'historySizeLimit' | 'arrayCleanupThreshold'>;
  }
) {
  return (
    draft: WritableDraft<Pick<State, 'undoStack' | 'undoStackTypeServerIndexes'>>
  ) => {
    const sizeLimit = props.context.historySizeLimit;
    const deletionThreshold = props.context.arrayCleanupThreshold;

    // If next undo server type is not available in server then remove it
    const nextRecord = draft.undoStack[draft.undoStack.length - 1];
    if (nextRecord?.type === 'server' && props.serverFacades.size > 0) {
      if (!props.serverFacades.hasOlderThan(nextRecord.revision + 1)) {
        draft.undoStack.pop();
        draft.undoStackTypeServerIndexes.pop();
      }
    }

    if (sizeLimit < 0) {
      return;
    }

    let remainingDeleteCount =
      draft.undoStack.length - draft.undoStackTypeServerIndexes.length - sizeLimit;

    if (remainingDeleteCount < deletionThreshold) {
      return;
    }

    if (draft.undoStackTypeServerIndexes.length === 0) {
      draft.undoStack.splice(0, remainingDeleteCount);
      return;
    }

    let start = 0;
    let end = 0;
    for (let i = 0; i < draft.undoStackTypeServerIndexes.length; i++) {
      const serverIndex = draft.undoStackTypeServerIndexes[i];
      if (serverIndex === undefined) {
        continue;
      }

      end = serverIndex;

      const deleteCount = Math.min(end - start, remainingDeleteCount);
      remainingDeleteCount -= deleteCount;
      draft.undoStack.splice(start, deleteCount);

      for (let j = i; j < draft.undoStackTypeServerIndexes.length; j++) {
        const serverIndex = draft.undoStackTypeServerIndexes[j];
        if (serverIndex === undefined) {
          continue;
        }
        draft.undoStackTypeServerIndexes[j] = serverIndex - deleteCount;
      }

      if (remainingDeleteCount <= 0) {
        return;
      }

      start = serverIndex + 1 - deleteCount;
    }

    end = start + remainingDeleteCount;
    const deleteCount = end - start;
    draft.undoStack.splice(start, deleteCount);
  };
}
