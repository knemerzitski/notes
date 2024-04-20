import { beforeEach, describe, expect, it } from 'vitest';
import { CollabEditor } from '../editor/collab-editor';

import { Entry } from '../editor/tail-text-history';
import { ServerRevisionRecord, addFiltersToRevisionRecords } from '../records/record';
import { RevisionTailRecords } from '../records/revision-tail-records';
import { createServerClientsHelper } from './helpers/server-client';

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
  let helper: ReturnType<typeof createServerClientsHelper<'A' | 'B'>>;

  beforeEach(() => {
    const revisionTailRecords = new RevisionTailRecords<ServerRevisionRecord>();
    addFiltersToRevisionRecords(revisionTailRecords);
    helper = createServerClientsHelper(revisionTailRecords, {
      A: new CollabEditor({
        userId: 'A',
      }),
      B: new CollabEditor({
        userId: 'B',
      }),
    });
  });

  it('restores history from server records containing two users', () => {
    const { server, client } = helper;

    client.A.instance.insertText('Hi from A.');
    client.A.submitChangesInstant();
    client.B.instance.insertText('Hi, im B.');
    client.B.submitChangesInstant();
    client.A.instance.setCaretPosition(-1);
    client.A.instance.insertText('[A_END]');
    client.A.submitChangesInstant();
    client.A.instance.setCaretPosition(0);
    client.A.instance.insertText('[A_START]');
    client.A.submitChangesInstant();
    client.B.instance.setCaretPosition(0);
    client.B.instance.insertText('[Bstart]');
    client.B.submitChangesInstant();
    client.B.instance.setCaretPosition(17);
    client.B.instance.deleteTextCount(9);
    client.B.submitChangesInstant();
    client.B.instance.setCaretPosition(27);
    client.B.instance.insertText('[B_almost_end]');
    client.B.submitChangesInstant();
    client.A.instance.setCaretPosition(18);
    client.A.instance.insertText('Between: ');
    client.A.submitChangesInstant();

    const restoredEditorB = new CollabEditor({
      initialText: {
        headText: server.instance.getHeadText(),
      },
      userId: client.B.instance.userId,
    });

    restoredEditorB.addServerRecords(server.instance.records);
    restoredEditorB.historyRestore(client.B.instance.historyEntryCount);

    expect(historyEntriesInfo(client.B.instance.historyEntries)).toStrictEqual(
      historyEntriesInfo(restoredEditorB.historyEntries)
    );
  });

  it('restores history that includes complete deletion of an entry', () => {
    const { server, client } = helper;

    client.B.instance.insertText('start typing in B');
    client.B.submitChangesInstant();
    client.B.instance.setCaretPosition(5);
    client.B.instance.insertText(' next');
    client.B.submitChangesInstant();
    client.A.instance.setCaretPosition(0);
    client.A.instance.insertText('[beginning by A]');
    client.A.submitChangesInstant();
    client.B.instance.insertText('BB');
    client.B.submitChangesInstant();
    client.A.instance.setCaretPosition(30);
    client.A.instance.deleteTextCount(4);
    client.A.submitChangesInstant();
    const restoredEditorB = new CollabEditor({
      initialText: {
        headText: server.instance.getHeadText(),
      },
      userId: client.B.instance.userId,
    });

    restoredEditorB.addServerRecords(server.instance.records);
    restoredEditorB.historyRestore(client.B.instance.historyEntryCount);

    expect(historyEntriesInfo(restoredEditorB.historyEntries)).toStrictEqual(
      historyEntriesInfo(client.B.instance.historyEntries)
    );
  });
});
