import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset';

import { ReadonlyHistoryRecord } from '../history/collab-history';
import { RevisionRecords } from '../records/revision-records';

import { fakeServerRevisionRecord } from './helpers/populate';
import { createHelperCollabEditingEnvironment } from './helpers/server-client';

function historyEntriesInfo(records: readonly ReadonlyHistoryRecord[]) {
  return records.map((e) => ({
    changeset: e.changeset.toString(),
    afterSelection: e.afterSelection,
    beforeSelection: e.beforeSelection,
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
    const restoredServiceB = clientB2.service;
    restoredServiceB.historyRestore(client.B.service.history.records.length);

    expect(historyEntriesInfo(client.B.service.history.records)).toStrictEqual(
      historyEntriesInfo(restoredServiceB.history.records)
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

    const restoredServiceB = clientB2.service;
    restoredServiceB.historyRestore(client.B.service.history.records.length);

    expect(historyEntriesInfo(restoredServiceB.history.records)).toStrictEqual(
      historyEntriesInfo(client.B.service.history.records)
    );
  });
});

describe('restore with undo', () => {
  let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A'>>;

  beforeEach(() => {
    helper = createHelperCollabEditingEnvironment({
      server: {
        records: new RevisionRecords({
          records: [
            fakeServerRevisionRecord({
              changeset: Changeset.parseValue(['']),
              revision: 1,
              creatorUserId: 'A',
            }),
            fakeServerRevisionRecord({
              changeset: Changeset.parseValue(['123']),
              revision: 2,
              creatorUserId: 'A',
            }),
          ],
        }),
      },
      clientNames: ['A'],
      service: {
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

    expect(client.A.service.canUndo()).toBeTruthy();
    expect(client.A.valueWithSelection()).toStrictEqual('>123');
    expect(client.A.service.undo()).toBeTruthy();
    expect(client.A.valueWithSelection()).toStrictEqual('>');
    expect(client.A.service.canUndo()).toBeTruthy();
    expect(client.A.service.undo()).toBeFalsy();
    expect(client.A.valueWithSelection()).toStrictEqual('>');
  });
});
