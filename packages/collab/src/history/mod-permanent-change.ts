import { Logger } from '../../../utils/src/logging';

import { Changeset } from '../changeset';
import { swapChangesets } from '../changeset/swap-changesets';
import { SelectionRange } from '../client/selection-range';
import { TextMemoRecords } from '../records/text-memo-records';

import {
  CollabHistoryModification,
  HistoryRecord,
  ReadonlyHistoryRecord,
} from './collab-history';

export interface PermanentChangeModificationContext {
  readonly serverTailTextTransformToRecordsTailText: Changeset | null;
  readonly records: Pick<
    TextMemoRecords<ReadonlyHistoryRecord>,
    'at' | 'getTextAt' | 'length'
  > & {
    readonly tailText: Changeset;
  };
  readonly modification: (changes: CollabHistoryModification) => void;
}

/**
 * Add permanent change to history. Modifies every record as if change has always been there.
 */
export function permanentChangeModification(
  changeset: Changeset,
  history: PermanentChangeModificationContext,
  options?: {
    logger?: Logger;
  }
) {
  const logger = options?.logger;

  logger?.debug('permanentChangeModification', {
    changeset: changeset.toString(),
  });

  let currentSwapTransform = changeset;

  const modifiedRecords: ReadonlyHistoryRecord[] = [];
  for (let i = history.records.length - 1; i >= 0; i--) {
    const record = history.records.at(i);
    if (!record) {
      continue;
    }

    const modRecord: HistoryRecord = {
      ...record,
    };

    const [nextSwapTransform, newRecordChangeset] = swapChangesets(
      history.records.getTextAt(i - 1).length,
      record.changeset,
      currentSwapTransform
    );

    modRecord.changeset = newRecordChangeset;
    modRecord.afterSelection = SelectionRange.closestRetainedPosition(
      record.afterSelection,
      currentSwapTransform
    );
    modRecord.beforeSelection = SelectionRange.closestRetainedPosition(
      record.beforeSelection,
      currentSwapTransform
    );

    currentSwapTransform = nextSwapTransform;

    logger?.debug('index', {
      index: i,
      update: `${record.changeset.toString()} => ${modRecord.changeset.toString()}`,
      currentSwapTransform: currentSwapTransform.toString(),
    });

    // Must reverse records later since looping from end to start
    modifiedRecords.push(modRecord);
  }

  modifiedRecords.reverse();

  const newServerTailTextTransformToRecordsTailText =
    history.serverTailTextTransformToRecordsTailText
      ? history.serverTailTextTransformToRecordsTailText.compose(currentSwapTransform)
      : currentSwapTransform;

  const newRecordsTailText = history.records.tailText.compose(currentSwapTransform);

  logger?.debug('newRecordsTailText', {
    newRecordsTailText: newRecordsTailText.toString(),
    tailText: history.records.tailText.toString(),
    currentSwapTransform: currentSwapTransform.toString(),
  });

  history.modification({
    serverTailTextTransformToRecordsTailText: newServerTailTextTransformToRecordsTailText,
    recordsTailText: newRecordsTailText,
    recordsSplice: {
      start: 0,
      deleteCount: history.records.length,
      records: modifiedRecords,
    },
  });
}
