import { WritableDraft } from 'immer';
import { Context, State } from '../types';
import { isDefined } from '../../../../../utils/src/type-guards/is-defined';
import { getFirstHistoryRecord, getLastHistoryRecord } from '../utils/history-record';

export function removeUnusedViewChanges(props: {
  readonly context: Pick<Context, 'arrayCleanupThreshold'>;
}) {
  return (draft: WritableDraft<State>) => {
    const deletionThreshold = props.context.arrayCleanupThreshold;

    const smallestViewIndex = findSmallestViewIndex(draft);

    const deleteCount = Number.isFinite(smallestViewIndex)
      ? smallestViewIndex - draft.viewIndexOffset
      : draft.viewChanges.length;

    if (deleteCount < deletionThreshold) {
      return;
    }

    draft.viewChanges.splice(0, deleteCount);

    if (draft.viewChanges.length === 0) {
      draft.viewIndexOffset = 0;
    } else {
      draft.viewIndexOffset = smallestViewIndex;
    }
  };
}

function findSmallestViewIndex(draft: State) {
  return [draft.undoStack, draft.redoStack]
    .flatMap((stack) => [
      getFirstHistoryRecord(stack, 'view')?.viewIndex,
      getLastHistoryRecord(stack, 'view')?.viewIndex,
    ])
    .filter(isDefined)
    .reduce((a, b) => Math.min(a, b), Infinity);
}
