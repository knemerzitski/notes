import { Logger } from '../../../utils/src/logging';

import { Changeset, ChangesetOperationError } from '../changeset';
import { swapChangesets } from '../changeset/swap-changesets';
import { CollabClient } from '../client/collab-client';
import { SelectionRange } from '../client/selection-range';
import { TextMemoRecords } from '../records/text-memo-records';
import {
  getOrChangeset,
  getOrRevision,
  OrRevisionChangeset,
} from '../utils/revision-changeset';

import { CollabHistoryModification, ReadonlyHistoryRecord } from './collab-history';

export interface ExternalChangeModificationContext {
  readonly serverIndex: number;
  readonly client: Pick<CollabClient, 'server'>;
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
 * Adds external change to history based on current server index.
 * External change modifies all records as if change has always been there.
 * In other words external change is permanent and cannot be undone.
 * If external change deletes everything, whole history is lost.
 */
export function externalChangeModification(
  orRevisionChangeset: OrRevisionChangeset,
  history: ExternalChangeModificationContext,
  options?: {
    logger?: Logger;
  }
) {
  const logger = options?.logger;

  const changeset = getOrChangeset(orRevisionChangeset);

  // [0, serverIndex]
  const newBeforeRecords: ReadonlyHistoryRecord[] = [];
  // [serverIndex + 1, history.records.length - 1]
  const newAfterRecords: ReadonlyHistoryRecord[] = [];

  let newTailText: Changeset;
  let newServerTailRevision: number | undefined;
  let newServerTailTextTransformToRecordsTailText: Changeset | undefined | null;

  const serverIndex = history.serverIndex;
  logger?.debug('serverIndex', serverIndex);
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

      logger?.debug('beforeServerIndex', {
        index: i,
        update: `${record.changeset.toString()} => ${modifiedRecordValue.changeset.toString()}`,
        swapChangeset: swapChangeset.toString(),
      });
    }

    newBeforeRecords.reverse();

    const currentTransform = history.serverTailTextTransformToRecordsTailText;

    newTailText = history.records.tailText.compose(swapChangeset);

    try {
      newServerTailTextTransformToRecordsTailText = currentTransform
        ? currentTransform.compose(swapChangeset)
        : swapChangeset;
      if (currentTransform) {
        logger?.debug('newServerTailTextTransformToRecordsTailText', {
          newServerTailTextTransformToRecordsTailText:
            newServerTailTextTransformToRecordsTailText.toString(),
          currentTransform: currentTransform.toString(),
          composed: currentTransform.compose(swapChangeset).toString(),
        });
      } else {
        logger?.debug('newServerTailTextTransformToRecordsTailText', {
          newServerTailTextTransformToRecordsTailText:
            newServerTailTextTransformToRecordsTailText.toString(),
          swapChangeset: swapChangeset.toString(),
        });
      }
    } catch (err) {
      if (err instanceof ChangesetOperationError) {
        logger?.error('processExternalChange.invalidTransform', {
          changeset: changeset.toString(),
          currentTransform: currentTransform?.toString(),
          swapChangeset: swapChangeset.toString(),
        });
      } else {
        throw err;
      }
    }
  } else {
    newTailText = history.client.server;
    const revision = getOrRevision(orRevisionChangeset);
    if (revision != null) {
      newServerTailRevision = revision;
      newServerTailTextTransformToRecordsTailText = null;
    }
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

    logger?.debug('afterServerIndex', {
      index: i,
      update: `${record.changeset.toString()} => ${modifiedRecordValue.changeset.toString()}`,
    });
  }

  history.modification({
    serverTailRevision: newServerTailRevision,
    serverTailTextTransformToRecordsTailText: newServerTailTextTransformToRecordsTailText,
    recordsTailText: newTailText,
    recordsSplice: {
      start: 0,
      deleteCount: history.records.length,
      records: [...newBeforeRecords, ...newAfterRecords],
    },
  });
}
