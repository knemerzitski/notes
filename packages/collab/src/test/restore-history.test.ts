import { beforeEach, describe, expect, it } from 'vitest';
import { CollabEditor } from '../client/collab-editor';

import { ServerRevisionRecord } from '../records/record';
import { RevisionTailRecords } from '../records/revision-tail-records';
import { createHelperCollabEditingEnvironment } from './helpers/server-client';
import { subscribeEditorListeners } from '../records/editor-revision-records';
import { Entry } from '../client/collab-history';

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
  let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A' | 'B'>>;

  beforeEach(() => {
    const revisionTailRecords = new RevisionTailRecords<ServerRevisionRecord>({
      serializeRecord: ServerRevisionRecord.serialize,
    });
    subscribeEditorListeners(revisionTailRecords);
    helper = createHelperCollabEditingEnvironment(revisionTailRecords, ['A', 'B']);
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
      recordsBuffer: {
        version: server.instance.getHeadText().revision,
      },
      client: {
        server: server.instance.getHeadText().changeset,
      },
      userId: client.B.editor.userId,
    });

    restoredEditorB.addServerRecords(server.instance.records);
    restoredEditorB.historyRestore(client.B.editor.history.entries.length);

    expect(historyEntriesInfo(client.B.editor.history.entries)).toStrictEqual(
      historyEntriesInfo(restoredEditorB.history.entries)
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
      recordsBuffer: {
        version: server.instance.getHeadText().revision,
      },
      client: {
        server: server.instance.getHeadText().changeset,
      },
      userId: client.B.editor.userId,
    });

    restoredEditorB.addServerRecords(server.instance.records);
    restoredEditorB.historyRestore(client.B.editor.history.entries.length);

    expect(historyEntriesInfo(restoredEditorB.history.entries)).toStrictEqual(
      historyEntriesInfo(client.B.editor.history.entries)
    );
  });
});
