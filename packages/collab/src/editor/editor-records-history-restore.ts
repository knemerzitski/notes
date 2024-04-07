import { RevisionChangeset } from '../records/revision-changeset';
import { RevisionRecords } from '../records/revision-records';
import { EditorRecord } from './collaborative-editor';
import { LocalChangesetEditorHistory } from './local-changeset-editor-history';

export interface EditorRecordsHistoryRestoreProps<TRecord extends RevisionChangeset> {
  records: RevisionRecords<TRecord>;
  historyTailRevision: number;
  history: LocalChangesetEditorHistory;
}

export class EditorRecordsHistoryRestore<TRecord extends EditorRecord> {
  private serverRecords: RevisionRecords<TRecord>;
  private historyTailRevision: number;
  private history: LocalChangesetEditorHistory;

  constructor(props: EditorRecordsHistoryRestoreProps<TRecord>) {
    this.serverRecords = props.records;
    this.historyTailRevision = props.historyTailRevision;
    this.history = props.history;
  }

  restore(
    desiredRestoreCount: number,
    clientId?: string,
    recursive = true
  ): number | false {
    if (desiredRestoreCount <= 0) return 0;

    let potentialRestoreCount = 0;
    const relevantRecords: EditorRecord[] = [];
    for (
      let i = this.serverRecords.revisionToIndex(this.historyTailRevision);
      i >= 0;
      i--
    ) {
      const record = this.serverRecords.records[i];
      if (!record) continue;
      relevantRecords.push(record);
      if (!clientId || !('clientId' in record) || record.clientId === clientId) {
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

    const newTailDocument = this.serverRecords.records
      .slice(0, firstRecordIndex)
      .reduce(
        (a, b) => a.compose(b.changeset),
        this.serverRecords.tailDocument.changeset
      );

    const addedEntriesCount = this.history.restoreHistoryEntries(
      newTailDocument,
      relevantRecords.map((record) => {
        const isOtherClient =
          clientId && 'clientId' in record && record.clientId !== clientId;
        if (!record.selection || isOtherClient) {
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
              selectionStart: record.selection.after.start,
              selectionEnd: record.selection.after.end,
            },
            undo: {
              selectionStart: record.selection.before.start,
              selectionEnd: record.selection.before.start,
            },
          };
        }
      })
    );

    this.historyTailRevision = firstRecord.revision - 1;

    let restoredCount = addedEntriesCount;

    const remainingCount = desiredRestoreCount - restoredCount;
    if (remainingCount > 0 && potentialRestoreCount > 0 && recursive) {
      const nextRestoredCount = this.restore(remainingCount, clientId, recursive);
      if (typeof nextRestoredCount === 'number') {
        restoredCount += nextRestoredCount;
      }
    }

    return restoredCount;
  }
}
