import { Logger } from '../../../utils/src/logging';

import { Changeset } from '../changeset';
import { swapChangesets } from '../changeset/swap-changesets';
import { SelectionRange } from '../client/selection-range';
import { RevisionChangeset } from '../records/record';
import { CollabHistoryModification, ReadonlyHistoryRecord } from './collab-history';

export interface ExternalChangeModificationContext {
  readonly serverTailRecord: RevisionChangeset;
  readonly serverToLocalHistoryTransform: Changeset;
  readonly records: readonly ReadonlyHistoryRecord[];
  readonly tailText: Changeset;
  readonly serverIndex: number;
  readonly modification: (changes: CollabHistoryModification) => void;
}

/**
 * Adds external change to history based on current server index.
 * External change modifies all records as if change has always been there.
 * In other words external change is permanent and cannot be undone.
 * If external change deletes everything, whole history is lost.
 */
export function externalChangeModification(
  changeset: Changeset,
  history: ExternalChangeModificationContext,
  options?: {
    logger?: Logger;
  }
) {
  const logger = options?.logger;

  // [0, serverIndex]
  const modRecordsBefore: ReadonlyHistoryRecord[] = [];
  // [serverIndex + 1, history.records.length - 1]
  const modRecordAfter: ReadonlyHistoryRecord[] = [];

  let newServerToLocalHistoryTransform: Changeset | undefined | null;

  const serverIndex = history.serverIndex;
  logger?.debug('serverIndex', serverIndex);
  if (serverIndex >= 0) {
    let currentSwapTransform = changeset;
    for (let i = serverIndex; i >= 0; i--) {
      const record = history.records.at(i);
      if (!record) {
        continue;
      }

      const modRecord = {
        ...record,
      };
      modRecordsBefore.push(modRecord);

      const [nextSwapTransform, newRecordChangset] = swapChangesets(
        (history.records[i - 1]?.changeset ?? history.tailText).length,
        record.changeset,
        currentSwapTransform
      );

      modRecord.changeset = newRecordChangset;
      modRecord.afterSelection = SelectionRange.closestRetainedPosition(
        record.afterSelection,
        currentSwapTransform
      );
      modRecord.beforeSelection = SelectionRange.closestRetainedPosition(
        record.beforeSelection,
        currentSwapTransform
      );

      currentSwapTransform = nextSwapTransform;

      logger?.debug('beforeServerIndex', {
        index: i,
        update: `${record.changeset.toString()} => ${modRecord.changeset.toString()}`,
        swapChangeset: currentSwapTransform.toString(),
      });
    }

    modRecordsBefore.reverse();

    newServerToLocalHistoryTransform =
      history.serverToLocalHistoryTransform.compose(currentSwapTransform);
  } else {
    newServerToLocalHistoryTransform =
      history.serverToLocalHistoryTransform.compose(changeset);
  }

  let followComposition = changeset;
  for (let i = serverIndex + 1; i < history.records.length; i++) {
    const record = history.records.at(i);
    if (!record) {
      continue;
    }

    const nextFollowComposition = record.changeset.follow(followComposition);

    const modRecord = {
      ...record,
    };
    modRecordAfter.push(modRecord);

    modRecord.changeset = followComposition.follow(record.changeset);
    modRecord.beforeSelection = SelectionRange.closestRetainedPosition(
      modRecord.beforeSelection,
      followComposition
    );
    modRecord.afterSelection = SelectionRange.closestRetainedPosition(
      record.afterSelection,
      nextFollowComposition
    );

    followComposition = nextFollowComposition;

    logger?.debug('afterServerIndex', {
      index: i,
      update: `${record.changeset.toString()} => ${modRecord.changeset.toString()}`,
    });
  }

  history.modification({
    serverToLocalHistoryTransform: newServerToLocalHistoryTransform,
    recordsSplice: {
      start: 0,
      deleteCount: history.records.length,
      records: [...modRecordsBefore, ...modRecordAfter],
    },
  });

  return {
    viewComposable: followComposition,
  };
}
