import { beforeEach, describe, expect, it } from 'vitest';
import { CollabEditor } from '../editor/collab-editor';

import { Changeset } from '../changeset/changeset';
import { Entry } from '../editor/tail-text-history';
import { ServerRevisionRecord, addFiltersToRevisionRecords } from '../records/record';
import { RevisionText } from '../records/revision-text';

function historyEntriesInfo(entries: Readonly<Entry[]>) {
  return entries.map((e) => ({
    execute: {
      changeset: e.execute.changeset.toString(),
      selectionStart: e.execute.selectionStart,
      selectionEnd: e.execute.selectionEnd,
    },
    undo: {
      changeset: e.undo.changeset.toString(),
      selectionStart: e.undo.selectionStart,
      selectionEnd: e.undo.selectionEnd,
    },
  }));
}

describe('persist history in revision records', () => {
  const initialTailText = {
    changeset: Changeset.EMPTY,
    revision: -1,
  };

  let serverRecords: RevisionText<ServerRevisionRecord>;
  let editorA: CollabEditor;
  let editorB: CollabEditor;

  function editorSubmit(submitEditor: CollabEditor, ...otherEditors: CollabEditor[]) {
    const submittedRecord = submitEditor.submitChanges();
    if (submittedRecord) {
      const recordInsertion = serverRecords.insert({
        ...submittedRecord,
        creatorUserId: submitEditor.userId ?? 'unknown',
      });
      submitEditor.submittedChangesAcknowledged(recordInsertion.processedRecord);
      editorB.handleExternalChange(recordInsertion.processedRecord);
      otherEditors.forEach((e) => {
        e.handleExternalChange(recordInsertion.processedRecord);
      });
    }
  }

  function editorASubmit() {
    editorSubmit(editorA, editorB);
  }

  function editorBSubmit() {
    editorSubmit(editorB, editorA);
  }

  beforeEach(() => {
    serverRecords = new RevisionText();
    addFiltersToRevisionRecords(serverRecords);
    editorA = new CollabEditor({
      initialText: {
        headText: initialTailText,
      },
      userId: 'A',
    });
    editorB = new CollabEditor({
      initialText: {
        headText: initialTailText,
      },
      userId: 'B',
    });
  });

  it('restores history from server records containing two users', () => {
    editorA.insertText('Hi from A.');
    editorASubmit();
    editorB.insertText('Hi, im B.');
    editorBSubmit();
    editorA.setCaretPosition(-1);
    editorA.insertText('[A_END]');
    editorASubmit();
    editorA.setCaretPosition(0);
    editorA.insertText('[A_START]');
    editorASubmit();
    editorB.setCaretPosition(0);
    editorB.insertText('[Bstart]');
    editorBSubmit();
    editorB.setCaretPosition(17);
    editorB.deleteTextCount(9);
    editorBSubmit();
    editorB.setCaretPosition(27);
    editorB.insertText('[B_almost_end]');
    editorBSubmit();
    editorA.setCaretPosition(18);
    editorA.insertText('Between: ');
    editorASubmit();

    const restoredEditorB = new CollabEditor({
      initialText: {
        headText: serverRecords.getHeadText(),
      },
      userId: 'B',
    });

    restoredEditorB.addServerRecords(serverRecords.records);
    restoredEditorB.historyRestore(editorB.historyEntryCount);

    expect(historyEntriesInfo(editorB.historyEntries)).toStrictEqual(
      historyEntriesInfo(restoredEditorB.historyEntries)
    );
  });

  it('restores history that includes complete deletion of an entry', () => {
    editorB.insertText('start typing in B');
    editorBSubmit();
    editorB.setCaretPosition(5);
    editorB.insertText(' next');
    editorBSubmit();
    editorA.setCaretPosition(0);
    editorA.insertText('[beginning by A]');
    editorASubmit();
    editorB.insertText('BB');
    editorBSubmit();
    editorA.setCaretPosition(30);
    editorA.deleteTextCount(4);
    editorASubmit();
    const restoredEditorB = new CollabEditor({
      initialText: {
        headText: serverRecords.getHeadText(),
      },
      userId: 'B',
    });

    restoredEditorB.addServerRecords(serverRecords.records);
    restoredEditorB.historyRestore(editorB.historyEntryCount);

    expect(historyEntriesInfo(restoredEditorB.historyEntries)).toStrictEqual(
      historyEntriesInfo(editorB.historyEntries)
    );
  });
});
