import { beforeEach, describe, expect, it } from 'vitest';
import { CollabEditor } from '../client/collab-editor';

import { Entry } from '../client/tail-text-history';
import { ServerRevisionRecord } from '../records/record';
import { RevisionTailRecords } from '../records/revision-tail-records';
import { createServerClientsHelper } from './helpers/server-client';
import { addEditorFilters } from '../records/editor-revision-records';

function historyEntriesInfo(entries: Readonly<Entry[]>) {
  return entries.map((e) => ({
    execute: {
      changeset: e.execute.changeset.toString(),
      selection: e.execute.selection,
    },
    undo: {
      changeset: e.undo.changeset.toString(),
      selection: e.undo.selection,
    },
  }));
}

describe('persist history in revision records', () => {
  let helper: ReturnType<typeof createServerClientsHelper<'A' | 'B'>>;

  beforeEach(() => {
    const revisionTailRecords = new RevisionTailRecords<ServerRevisionRecord>();
    addEditorFilters(revisionTailRecords);
    helper = createServerClientsHelper(revisionTailRecords, ['A', 'B']);
  });

  it('restores history from server records containing two users', () => {
    const { server, client } = helper;

    client.A.insertText('Hi from A.');
    client.A.submitChangesInstant();
    client.B.insertText('Hi, im B.');
    client.B.submitChangesInstant();
    client.A.setCaretPosition(-1);
    client.A.insertText('[A_END]');
    client.A.submitChangesInstant();
    client.A.setCaretPosition(0);
    client.A.insertText('[A_START]');
    client.A.submitChangesInstant();
    client.B.setCaretPosition(0);
    client.B.insertText('[Bstart]');
    client.B.submitChangesInstant();
    client.B.setCaretPosition(17);
    client.B.deleteTextCount(9);
    client.B.submitChangesInstant();
    client.B.setCaretPosition(27);
    client.B.insertText('[B_almost_end]');
    client.B.submitChangesInstant();
    client.A.setCaretPosition(18);
    client.A.insertText('Between: ');
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

    client.B.insertText('start typing in B');
    client.B.submitChangesInstant();
    client.B.setCaretPosition(5);
    client.B.insertText(' next');
    client.B.submitChangesInstant();
    client.A.setCaretPosition(0);
    client.A.insertText('[beginning by A]');
    client.A.submitChangesInstant();
    client.B.insertText('BB');
    client.B.submitChangesInstant();
    client.A.setCaretPosition(30);
    client.A.deleteTextCount(4);
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
