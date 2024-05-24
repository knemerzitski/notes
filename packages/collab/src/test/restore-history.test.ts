import { beforeEach, describe, expect, it } from 'vitest';

import { createHelperCollabEditingEnvironment } from './helpers/server-client';
import { newServerRecords } from '../records/server-records';
import { Entry } from '../client/collab-history';
import { createFakeServerRevisionRecordData } from '../../../../__EXCLUDE/populate';
import { Changeset } from '../changeset/changeset';
import { ChangesetRevisionRecords } from '../records/changeset-revision-records';

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
    helper = createHelperCollabEditingEnvironment({
      clientNames: ['A', 'B'],
    });
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

    const clientB2 = helper.addNewClient('B2', client.B.name, {
      recordsBuffer: {
        version: server.localRecords.getHeadText().revision,
      },
      client: {
        server: server.localRecords.getHeadText().changeset,
      },
    });
    const restoredEditorB = clientB2.editor;
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

    const clientB2 = helper.addNewClient('B2', client.B.name, {
      recordsBuffer: {
        version: server.localRecords.getHeadText().revision,
      },
      client: {
        server: server.localRecords.getHeadText().changeset,
      },
    });

    const restoredEditorB = clientB2.editor;
    restoredEditorB.historyRestore(client.B.editor.history.entries.length);

    expect(historyEntriesInfo(restoredEditorB.history.entries)).toStrictEqual(
      historyEntriesInfo(client.B.editor.history.entries)
    );
  });
});

describe('restore with undo', () => {
  let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A'>>;

  beforeEach(() => {
    helper = createHelperCollabEditingEnvironment({
      server: {
        changesetRecords: new ChangesetRevisionRecords({
          revisionRecords: newServerRecords({
            records: [
              createFakeServerRevisionRecordData({
                changeset: Changeset.parseValue(['']),
                revision: 1,
                creatorUserId: 'A',
              }),
              createFakeServerRevisionRecordData({
                changeset: Changeset.parseValue(['123']),
                revision: 2,
                creatorUserId: 'A',
              }),
            ],
          }),
        }),
      },
      clientNames: ['A'],
      editor: {
        A: {
          client: {
            server: Changeset.parseValue(['123']),
          },
          recordsBuffer: {
            version: 2,
          },
        },
      },
    });
  });

  it('undoes until very last server record', () => {
    const { client } = helper;

    expect(client.A.editor.canUndo()).toBeTruthy();
    expect(client.A.valueWithSelection()).toStrictEqual('>123');
    expect(client.A.editor.undo()).toBeTruthy();
    expect(client.A.valueWithSelection()).toStrictEqual('>');
    expect(client.A.editor.canUndo()).toBeTruthy();
    expect(client.A.editor.undo()).toBeFalsy();
    expect(client.A.valueWithSelection()).toStrictEqual('>');
  });
});
