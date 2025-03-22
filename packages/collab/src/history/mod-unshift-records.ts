import { Logger } from '../../../utils/src/logging';
import { Changeset } from '../changeset';
import { swapChangesets } from '../changeset/swap-changesets';
import { SelectionRange } from '../client/selection-range';
import { RevisionChangeset } from '../records/record';
import { TextMemoRecords } from '../records/text-memo-records';

import {
  CollabHistoryModification,
  HistoryRecord,
  ReadonlyHistoryRecord,
} from './collab-history';

export type HistoryUnshiftEntry =
  | {
      type: 'external';
      changeset: Changeset;
    }
  | ({
      type: 'local';
    } & ReadonlyHistoryRecord);

export interface UnshiftRecordsModificationContext {
  readonly serverTailTextTransformToRecordsTailText: Changeset | null;
  readonly modification: (changes: CollabHistoryModification) => void;
}

/**
 * Adds new records to the beginning of history.
 */
export function unshiftRecordsModification(
  {
    newRecordsTailText,
    newEntries,
  }: {
    newRecordsTailText: RevisionChangeset;
    newEntries: HistoryUnshiftEntry[];
  },
  history: UnshiftRecordsModificationContext,
  options?: {
    logger?: Logger;
  }
) {
  const logger = options?.logger;

  const newEntriesMemo = new TextMemoRecords<HistoryUnshiftEntry>({
    tailText: newRecordsTailText.changeset,
    records: newEntries,
  });

  const newRecords: ReadonlyHistoryRecord[] = [];
  let currentSwapTransform = history.serverTailTextTransformToRecordsTailText;
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
      currentSwapTransform = currentSwapTransform
        ? entry.changeset.compose(currentSwapTransform)
        : entry.changeset;
    } else {
      const newRecord: HistoryRecord = {
        changeset: entry.changeset,
        afterSelection: entry.afterSelection,
        beforeSelection: entry.beforeSelection,
      };

      if (currentSwapTransform) {
        // Record is local and currentTransform is defined
        // Must swap record and currentTransform
        const [nextSwapTransform, newRecordChangeset] = swapChangesets(
          newEntriesMemo.getTextAt(i - 1).length,
          entry.changeset,
          currentSwapTransform
        );

        newRecord.changeset = newRecordChangeset;
        newRecord.afterSelection = SelectionRange.closestRetainedPosition(
          entry.afterSelection,
          currentSwapTransform
        );
        newRecord.beforeSelection = SelectionRange.closestRetainedPosition(
          entry.beforeSelection,
          currentSwapTransform
        );

        currentSwapTransform = nextSwapTransform;
      }

      logger?.debug('entry', {
        index: i,
        update: `${entry.changeset.toString()} => ${newRecord.changeset.toString()}`,
      });
      newRecords.unshift(newRecord);
    }
  }
  
  if (currentSwapTransform) {
    newEntriesMemo.tailText = newEntriesMemo.tailText.compose(currentSwapTransform);
  }

  history.modification({
    serverTailRevision: newRecordsTailText.revision,
    serverTailTextTransformToRecordsTailText: currentSwapTransform,
    recordsTailText: newEntriesMemo.tailText,
    recordsSplice: {
      start: 0,
      deleteCount: 0,
      records: newRecords,
    },
  });
}
