import { Changeset } from '../changeset';
import { swapChangesets } from '../changeset/swap-changesets';
import { SelectionRange } from '../client/selection-range';
import { TextMemoRecords } from '../records/text-memo-records';

import { HistoryRecord, ReadonlyHistoryRecord } from './collab-history';

export type HistoryUnshiftEntry =
  | {
      type: 'external';
      changeset: Changeset;
    }
  | ({
      type: 'local';
    } & ReadonlyHistoryRecord);

interface CollabHistoryContext {
  serverTailTextTransformToRecordsTailText: Changeset | null;
  recordsReplaceTailTextAndSplice(
    tailText: Changeset,
    start: number,
    deleteCount: number,
    ...records: ReadonlyHistoryRecord[]
  ): void;
}

/**
 * Adds new records to the beginning of history.
 */
export function processRecordsUnshift(
  {
    newRecordsTailText,
    newEntries,
  }: {
    newRecordsTailText: Changeset;
    newEntries: HistoryUnshiftEntry[];
  },
  history: CollabHistoryContext
) {
  const newEntriesMemo = new TextMemoRecords<HistoryUnshiftEntry>({
    tailText: newRecordsTailText,
    records: newEntries,
  });

  const resultNewRecords: ReadonlyHistoryRecord[] = [];
  let currentTransform = history.serverTailTextTransformToRecordsTailText;
  // Starting with `currentTransform` swap records from right to left.
  // External entries are composed on `currentTransform` along the way
  // As a result all external entries will composed on `currentTransform`
  // Final `currentTransform`  will be a transform that is compatible with new entries
  for (let i = newEntriesMemo.length - 1; i >= 0; i--) {
    const entry = newEntriesMemo.at(i);
    if (!entry) {
      continue;
    }

    if (entry.type === 'external') {
      // Compose external record on transform
      currentTransform = currentTransform
        ? entry.changeset.compose(currentTransform)
        : entry.changeset;
    } else {
      const newRecord: HistoryRecord = {
        changeset: entry.changeset,
        afterSelection: entry.afterSelection,
        beforeSelection: entry.beforeSelection,
      };

      if (currentTransform) {
        // Record is local and currentTransform is defined
        // Must swap record and currentTransform
        const [nextTransform, newRecordChangeset] = swapChangesets(
          newEntriesMemo.getTextAt(i - 1).length,
          entry.changeset,
          currentTransform
        );

        newRecord.changeset = newRecordChangeset;
        newRecord.afterSelection = SelectionRange.closestRetainedPosition(
          entry.afterSelection,
          currentTransform
        );
        newRecord.beforeSelection = SelectionRange.closestRetainedPosition(
          entry.beforeSelection,
          currentTransform
        );

        currentTransform = nextTransform;
      }

      resultNewRecords.unshift(newRecord);
    }
  }
  if (currentTransform) {
    newEntriesMemo.tailText = newEntriesMemo.tailText.compose(currentTransform);
  }

  history.recordsReplaceTailTextAndSplice(
    newEntriesMemo.tailText,
    0,
    0,
    ...resultNewRecords
  );
  history.serverTailTextTransformToRecordsTailText = currentTransform;
}
