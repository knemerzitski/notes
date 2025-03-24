import { Logger } from '../../../utils/src/logging';

import { Changeset } from '../changeset';
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
  const modRecordsBefore: ReadonlyHistoryRecord[] = [];
  // [serverIndex + 1, history.records.length - 1]
  const modRecordAfter: ReadonlyHistoryRecord[] = [];

  let newTailText: Changeset;
  let newServerTailRevision: number | undefined;
  let newServerTailTextTransformToRecordsTailText: Changeset | undefined | null;

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
      // TODO check variable names
      modRecordsBefore.push(modRecord);

      const [nextSwapTransform, newRecordChangset] = swapChangesets(
        history.records.getTextAt(i - 1).length,
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

    const currentTransform = history.serverTailTextTransformToRecordsTailText;

    newTailText = history.records.tailText.compose(currentSwapTransform);

    newServerTailTextTransformToRecordsTailText = currentTransform
      ? currentTransform.compose(currentSwapTransform)
      : currentSwapTransform;
    if (currentTransform) {
      logger?.debug('newServerTailTextTransformToRecordsTailText', {
        newServerTailTextTransformToRecordsTailText:
          newServerTailTextTransformToRecordsTailText.toString(),
        currentTransform: currentTransform.toString(),
        composed: currentTransform.compose(currentSwapTransform).toString(),
      });
    } else {
      logger?.debug('newServerTailTextTransformToRecordsTailText', {
        newServerTailTextTransformToRecordsTailText:
          newServerTailTextTransformToRecordsTailText.toString(),
        swapChangeset: currentSwapTransform.toString(),
      });
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
    serverTailRevision: newServerTailRevision,
    serverTailTextTransformToRecordsTailText: newServerTailTextTransformToRecordsTailText,
    recordsTailText: newTailText,
    recordsSplice: {
      start: 0,
      deleteCount: history.records.length,
      records: [...modRecordsBefore, ...modRecordAfter],
    },
  });
}
