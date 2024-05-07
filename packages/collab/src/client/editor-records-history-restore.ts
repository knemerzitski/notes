import { ServerRevisionRecord } from '../records/record';
import { RevisionTailRecords } from '../records/revision-tail-records';
import { LocalChangesetEditorHistory } from './local-changeset-editor-history';

type Record = Pick<ServerRevisionRecord, 'changeset' | 'revision'> &
  Partial<
    Pick<ServerRevisionRecord, 'beforeSelection' | 'afterSelection' | 'creatorUserId'>
  >;

export interface EditorRecordsHistoryRestoreProps<TRecord extends Record> {
  records: RevisionTailRecords<TRecord>;
  /**
   * Revision of oldest history entry. Initially historyTailRevision is headRevision without any history entries.
   */
  historyTailRevision: number;
  history: LocalChangesetEditorHistory;
}

export class EditorRecordsHistoryRestore<TRecord extends Record> {
  private serverRecords: RevisionTailRecords<TRecord>;
  private historyTailRevision: number;
  private history: LocalChangesetEditorHistory;

  constructor(props: EditorRecordsHistoryRestoreProps<TRecord>) {
    this.serverRecords = props.records;
    this.historyTailRevision = props.historyTailRevision;
    this.history = props.history;
  }

  restore(
    desiredRestoreCount: number,
    targetUserId?: string | symbol,
    recursive = true
  ): number | false {
    if (desiredRestoreCount <= 0) return 0;

    let potentialRestoreCount = 0;
    const relevantRecords: TRecord[] = [];
    for (
      let i = this.serverRecords.revisionToIndex(this.historyTailRevision);
      i >= 0;
      i--
    ) {
      const record = this.serverRecords.records[i];
      if (!record) continue;
      relevantRecords.push(record);
      if (
        !targetUserId ||
        !('creatorUserId' in record) ||
        record.creatorUserId === targetUserId
      ) {
        potentialRestoreCount++;
        if (potentialRestoreCount >= desiredRestoreCount) {
          break;
        }
      }
    }
    relevantRecords.reverse();
    const firstRecord = relevantRecords[0];
    if (!firstRecord) return false;

    const firstRecordIndex = this.serverRecords.revisionToIndex(firstRecord.revision);

    const newTailText = this.serverRecords.records
      .slice(0, firstRecordIndex)
      .reduce((a, b) => a.compose(b.changeset), this.serverRecords.tailText.changeset);

    const addedEntriesCount = this.history.restoreHistoryEntries(
      newTailText,
      relevantRecords.map((record) => {
        const isOtherUser =
          targetUserId &&
          'creatorUserId' in record &&
          record.creatorUserId !== targetUserId;
        if (!record.beforeSelection || !record.afterSelection || isOtherUser) {
          return {
            isTail: true,
            execute: {
              changeset: record.changeset,
            },
          };
        } else {
          return {
            execute: {
              changeset: record.changeset,
              selection: record.afterSelection,
            },
            undo: {
              selection: record.beforeSelection,
            },
          };
        }
      })
    );

    this.historyTailRevision = firstRecord.revision - 1;

    let restoredCount = addedEntriesCount;

    const remainingCount = desiredRestoreCount - restoredCount;
    if (remainingCount > 0 && potentialRestoreCount > 0 && recursive) {
      const nextRestoredCount = this.restore(remainingCount, targetUserId, recursive);
      if (typeof nextRestoredCount === 'number') {
        restoredCount += nextRestoredCount;
      }
    }

    return restoredCount;
  }
}
