import { Changeset } from '../changeset';
import { swapChangesets } from '../changeset/swap-changesets';
import { CollabClient } from '../client/collab-client';
import { SelectionRange } from '../client/selection-range';
import { TextMemoRecords } from '../records/text-memo-records';

import { ReadonlyHistoryRecord } from './collab-history';


export interface CollabHistoryContext {
  readonly serverIndex: number;
  readonly client: Pick<CollabClient, 'server'>;
  serverTailTextTransformToRecordsTailText: Changeset | null;
  readonly records: Pick<
    TextMemoRecords<ReadonlyHistoryRecord>,
    'at' | 'getTextAt' | 'length'
  > & {
    readonly tailText: Changeset;
  };
  recordsReplaceTailTextAndSplice(
    tailText: Changeset,
    start: number,
    deleteCount: number,
    ...records: ReadonlyHistoryRecord[]
  ): void;
}

/**
 * Adds external change to history based on current server index.
 * External change modifies all records as if change has always been there.
 * In other words external change is permanent and cannot be undone.
 * If external change deletes everything, whole history is lost.
 */
export function processExternalChange(
  changeset: Changeset,
  history: CollabHistoryContext
) {
  // [0, serverIndex]
  const newBeforeRecords: ReadonlyHistoryRecord[] = [];

  // [serverIndex + 1, history.records.length - 1]
  const newAfterRecords: ReadonlyHistoryRecord[] = [];

  let newTailText: Changeset;
  let newServerTailTextTransformToRecordsTailText: Changeset | undefined;

  const serverIndex = history.serverIndex;
  if (serverIndex >= 0) {
    let swapChangeset = changeset;
    for (let i = serverIndex; i >= 0; i--) {
      const record = history.records.at(i);
      if (!record) {
        continue;
      }

      const modifiedRecordValue = {
        ...record,
      };
      newBeforeRecords.push(modifiedRecordValue);

      const [nextSwapChangeset, newRecordChangset] = swapChangesets(
        history.records.getTextAt(i - 1).length,
        record.changeset,
        swapChangeset
      );

      modifiedRecordValue.changeset = newRecordChangset;
      modifiedRecordValue.afterSelection = SelectionRange.closestRetainedPosition(
        record.afterSelection,
        swapChangeset
      );
      modifiedRecordValue.beforeSelection = SelectionRange.closestRetainedPosition(
        record.beforeSelection,
        swapChangeset
      );

      swapChangeset = nextSwapChangeset;
    }

    newBeforeRecords.reverse();

    const currentTransform = history.serverTailTextTransformToRecordsTailText;

    newTailText = history.records.tailText.compose(swapChangeset);
    newServerTailTextTransformToRecordsTailText = currentTransform
      ? currentTransform.compose(swapChangeset)
      : swapChangeset;
  } else {
    newTailText = history.client.server;
  }

  let followComposition = changeset;
  for (let i = serverIndex + 1; i < history.records.length; i++) {
    const record = history.records.at(i);
    if (!record) {
      continue;
    }

    const nextFollowComposition = record.changeset.follow(followComposition);

    const modifiedRecordValue = {
      ...record,
    };
    newAfterRecords.push(modifiedRecordValue);

    modifiedRecordValue.changeset = followComposition.follow(record.changeset);
    modifiedRecordValue.beforeSelection = SelectionRange.closestRetainedPosition(
      modifiedRecordValue.beforeSelection,
      followComposition
    );
    modifiedRecordValue.afterSelection = SelectionRange.closestRetainedPosition(
      record.afterSelection,
      nextFollowComposition
    );

    followComposition = nextFollowComposition;
  }

  history.recordsReplaceTailTextAndSplice(
    newTailText,
    0,
    history.records.length,
    ...newBeforeRecords,
    ...newAfterRecords
  );
  if (newServerTailTextTransformToRecordsTailText !== undefined) {
    history.serverTailTextTransformToRecordsTailText =
      newServerTailTextTransformToRecordsTailText;
  }
}
