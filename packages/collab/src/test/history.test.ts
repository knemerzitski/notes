import { beforeEach, describe, expect, it } from 'vitest';

import { SelectionDirection } from '../editor/selection-range';

import { CollabEditor } from '../editor/collab-editor';
import { RevisionTailRecords } from '../records/revision-tail-records';
import { ServerRevisionRecord, addFiltersToRevisionRecords } from '../records/record';
import { createServerClientsHelper } from './helpers/server-client';

describe('single client', () => {
  let helper: ReturnType<typeof createServerClientsHelper<'A'>>;

  beforeEach(() => {
    const revisionTailRecords = new RevisionTailRecords<ServerRevisionRecord>();
    addFiltersToRevisionRecords(revisionTailRecords);
    helper = createServerClientsHelper(revisionTailRecords, {
      A: new CollabEditor(),
    });
  });

  it('undo, redo retains selection', () => {
    const { client } = helper;
    client.A.instance.insertText('hello world');
    client.A.setCaretFromValue('hello >world');
    client.A.instance.insertText('between ');
    client.A.setCaretFromValue('hello >between< world');
    expect(client.A.valueWithSelection()).toStrictEqual('hello >between< world');

    client.A.instance.selectionDirection = SelectionDirection.Backward;
    client.A.instance.deleteTextCount();
    client.A.instance.selectionDirection = SelectionDirection.Forward;
    expect(client.A.valueWithSelection()).toStrictEqual('hello > world');

    client.A.instance.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello >between< world');
    client.A.instance.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello > world');
  });
});

describe('two clients', () => {
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

  it('handles undo, redo of local changes', () => {
    const { client } = helper;

    client.A.instance.insertText('hello world');
    client.A.setCaretFromValue('hello >world');
    client.A.instance.insertText('between ');
    client.A.submitChangesInstant();

    expect(client.A.valueWithSelection()).toStrictEqual('hello between >world');
    client.A.instance.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello >world');
    client.A.instance.setCaretPosition(0);
    client.A.instance.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello between >world');

    client.B.instance.setCaretPosition(0);
    client.B.instance.insertText('ALL: ');
    client.B.submitChangesInstant();

    helper.expectTextsConverted('ALL: [1>]hello between [0>]world');

    client.A.instance.setCaretPosition(-1);
    client.A.instance.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: hello >world');
    client.A.instance.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: >');
    client.A.instance.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: hello world>');
    client.A.instance.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: hello between >world');
  });
});
