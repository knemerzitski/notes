import { beforeEach, describe, expect, it } from 'vitest';
import { CollabEditor } from '../client/collab-editor';

import { ServerRevisionRecord } from '../records/record';
import { RevisionTailRecords } from '../records/revision-tail-records';
import { createHelperCollabEditingEnvironment } from './helpers/server-client';
import { subscribeEditorListeners } from '../records/editor-revision-records';
import { Entry } from '../client/collab-history';
import { createFakeServerRevisionRecordData } from './helpers/populate';
import { Changeset } from '../changeset/changeset';

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
    const revisionTailRecords = new RevisionTailRecords<ServerRevisionRecord>();
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
        version: server.tailRecords.getHeadText().revision,
      },
      client: {
        server: server.tailRecords.getHeadText().changeset,
      },
      userId: client.B.editor.userId,
    });

    restoredEditorB.addServerRecords(server.tailRecords.records);
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
        version: server.tailRecords.getHeadText().revision,
      },
      client: {
        server: server.tailRecords.getHeadText().changeset,
      },
      userId: client.B.editor.userId,
    });

    restoredEditorB.addServerRecords(server.tailRecords.records);
    restoredEditorB.historyRestore(client.B.editor.history.entries.length);

    expect(historyEntriesInfo(restoredEditorB.history.entries)).toStrictEqual(
      historyEntriesInfo(client.B.editor.history.entries)
    );
  });
});

describe('restore with undo', () => {
  let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A'>>;

  beforeEach(() => {
    const revisionTailRecords = new RevisionTailRecords<ServerRevisionRecord>({
      records: [
        createFakeServerRevisionRecordData({
          changeset: Changeset.parseValue(['']),
          revision: 0,
          creatorUserId: 'A',
        }),
        createFakeServerRevisionRecordData({
          changeset: Changeset.parseValue(['123']),
          revision: 1,
          creatorUserId: 'A',
        }),
      ],
    });
    subscribeEditorListeners(revisionTailRecords);
    helper = createHelperCollabEditingEnvironment(revisionTailRecords, ['A'], {
      A: {
        client: {
          server: Changeset.parseValue(['123']),
        },
        recordsBuffer: {
          version: 1,
        },
      },
    });
  });

  it('undoes until very last server record', () => {
    const { server, client } = helper;

    expect(client.A.editor.canUndo()).toBeFalsy();
    client.A.editor.addServerRecords(server.tailRecords.records);
    expect(client.A.editor.canUndo()).toBeTruthy();
    expect(client.A.valueWithSelection()).toStrictEqual('>123');
    expect(client.A.editor.undo()).toBeTruthy();
    expect(client.A.valueWithSelection()).toStrictEqual('>');
    expect(client.A.editor.canUndo()).toBeTruthy();
    expect(client.A.editor.undo()).toBeFalsy();
    expect(client.A.valueWithSelection()).toStrictEqual('>');
  });
});
