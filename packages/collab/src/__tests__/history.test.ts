import { beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset';
import { CollabHistory } from '../history/collab-history';

import { createHelperCollabEditingEnvironment } from './helpers/server-client';

// TODO copied to collab2

const cs = (...values: unknown[]) => Changeset.parseValue(values);

describe('single client', () => {
  let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A'>>;

  beforeEach(() => {
    helper = createHelperCollabEditingEnvironment({
      clientNames: ['A'],
    });
  });

  it('undo, redo retains selection', () => {
    const { client } = helper;
    client.A.insertText('hello world');
    client.A.setCaretFromValue('hello >world');
    client.A.insertText('between ');
    client.A.setCaretFromValue('hello >between< world');
    expect(client.A.valueWithSelection()).toStrictEqual('hello >between< world');

    client.A.deleteTextCount();
    expect(client.A.valueWithSelection()).toStrictEqual('hello > world');

    client.A.service.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello >between< world');
    client.A.service.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello > world');
  });
});

describe('two clients', () => {
  let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A' | 'B'>>;

  beforeEach(() => {
    helper = createHelperCollabEditingEnvironment({
      clientNames: ['A', 'B'],
    });
  });

  describe('text external change records modification', () => {
    let history: CollabHistory;

    beforeEach(() => {
      history = helper.client.A.history;
    });

    function textValueWithSelection() {
      return helper.client.A.valueWithSelection();
    }

    /**
     * Goes through history each entry undo/redo and checks if value stays the same.
     */
    function expectHistoryUndoRedoRestoreValue() {
      let expected = textValueWithSelection();
      let i = 0;
      for (; i < history.records.length; i++) {
        history.undo();
        const undoValue = textValueWithSelection();
        if (undoValue === expected) break;
        history.redo();
        const redoValue = textValueWithSelection();
        expect(redoValue, `Redo/undo are not inverse at entry index ${i}`).toStrictEqual(
          expected
        );
        expected = undoValue;
        history.undo();
      }

      for (; i >= 0; i--) {
        history.redo();
      }
    }

    function expectHistoryBaseValue(expectedValue: string) {
      let i = 0;
      for (; i < history.records.length; i++) {
        history.undo();
      }
      expect(textValueWithSelection()).toStrictEqual(expectedValue);

      for (; i >= 0; i--) {
        history.redo();
      }
    }

    it('inserts to start and end', () => {
      const { client } = helper;

      client.A.insertText('[e0]');
      client.A.submitChangesInstant();
      client.A.insertText('[e1]');
      client.A.submitChanges();
      helper.client.A.insertText('[e2]');
      expect(textValueWithSelection()).toStrictEqual('[e0][e1][e2]>');

      client.B.insertText('[EXTERNAL]');
      client.B.selectionRange.set(-1);
      client.B.insertText('[EXTERNAL]');
      client.B.submitChangesInstant();

      expect(textValueWithSelection()).toStrictEqual('[EXTERNAL][e0][e1][e2]>[EXTERNAL]');

      expectHistoryUndoRedoRestoreValue();
      expectHistoryBaseValue('[EXTERNAL]>[EXTERNAL]');
      return;
    });

    it('local and external delete same value', () => {
      const { client } = helper;

      client.A.insertText('[e0]');
      client.A.insertText('[e1]');
      client.A.submitChangesInstant();
      client.A.insertText('[e2]');
      client.A.submitChanges();
      client.A.insertText('[e3]');
      expect(textValueWithSelection()).toStrictEqual('[e0][e1][e2][e3]>');

      client.A.setCaretPosition(4);
      client.A.deleteTextCount(4);
      expect(textValueWithSelection()).toStrictEqual('>[e1][e2][e3]');

      client.B.selectionRange.set(4);
      client.B.deleteTextCount(4);
      client.B.insertText('[EXTERNAL]');
      client.B.selectionRange.set(-1);
      client.B.insertText('[EXTERNAL]');
      client.B.submitChangesInstant();

      expect(textValueWithSelection()).toStrictEqual('[EXTERNAL]>[e1][e2][e3][EXTERNAL]');

      helper.client.A.setCaretPosition(22);
      expectHistoryUndoRedoRestoreValue();
      expectHistoryBaseValue('[EXTERNAL]>[EXTERNAL]');
    });

    it('local and external delete same value with more records and between', () => {
      const { client } = helper;

      client.A.insertText('[e0]');
      client.A.insertText('[e1]');
      client.A.insertText('[e2]');
      client.A.submitChangesInstant();
      client.A.insertText('[e3]');
      client.A.insertText('[e4]');
      client.A.insertText('[e5]');
      client.A.submitChanges();
      client.A.insertText('[e6]');
      client.A.insertText('[e7]');
      client.A.insertText('[e8]');
      expect(textValueWithSelection()).toStrictEqual(
        '[e0][e1][e2][e3][e4][e5][e6][e7][e8]>'
      );

      helper.client.A.setCaretPosition(4);
      helper.client.A.deleteTextCount(4);
      expect(textValueWithSelection()).toStrictEqual('>[e1][e2][e3][e4][e5][e6][e7][e8]');

      client.B.selectionRange.set(4);
      client.B.deleteTextCount(4);
      client.B.insertText('[EXTERNAL]');
      client.B.selectionRange.set(14);
      client.B.insertText('[BETWEEN]');
      client.B.selectionRange.set(-1);
      client.B.insertText('[EXTERNAL]');
      client.B.submitChangesInstant();

      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL]>[e1][BETWEEN][e2][e3][e4][e5][e6][e7][e8][EXTERNAL]'
      );

      helper.client.A.setCaretPosition(51);
      expectHistoryUndoRedoRestoreValue();
      expectHistoryBaseValue('[EXTERNAL]>[BETWEEN][EXTERNAL]');
    });

    it('multiple external changes value manual check', () => {
      const { client } = helper;

      client.A.insertText('[e0]');
      client.A.insertText('[e1]');
      client.A.insertText('[e2]');
      client.A.submitChangesInstant();
      client.A.insertText('[e3]');
      client.A.insertText('[e4]');
      client.A.insertText('[e5]');
      const submitted = client.A.submitChanges();
      client.A.insertText('[e6]');
      client.A.insertText('[e7]');
      client.A.insertText('[e8]');
      expect(textValueWithSelection()).toStrictEqual(
        '[e0][e1][e2][e3][e4][e5][e6][e7][e8]>'
      );

      helper.client.A.setCaretPosition(4);
      helper.client.A.deleteTextCount(4);
      expect(textValueWithSelection()).toStrictEqual('>[e1][e2][e3][e4][e5][e6][e7][e8]');

      client.B.selectionRange.set(4);
      client.B.deleteTextCount(4);
      client.B.insertText('[EXTERNAL]');
      client.B.selectionRange.set(14);
      client.B.insertText('[BETWEEN]');
      client.B.selectionRange.set(-1);
      client.B.insertText('[EXTERNAL]');
      client.B.submitChangesInstant();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL]>[e1][BETWEEN][e2][e3][e4][e5][e6][e7][e8][EXTERNAL]'
      );

      submitted.serverReceive().acknowledgeAndSendToOtherClients();
      client.A.submitChangesInstant();

      client.B.selectionRange.set(31);
      client.B.insertText('[somewhere]');
      client.B.submitChangesInstant();

      client.A.setCaretPosition(23);
      client.A.deleteTextCount(9);

      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1]>[e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]'
      );

      history.undo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN]>[e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]'
      );

      history.undo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5][e6][e7]>[EXTERNAL]'
      );

      history.undo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5][e6]>[EXTERNAL]'
      );

      history.undo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5]>[EXTERNAL]'
      );

      history.undo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4]>[EXTERNAL]'
      );

      history.undo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2][e3]>[somewhere][EXTERNAL]'
      );

      history.undo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2]>[somewhere][EXTERNAL]'
      );

      history.undo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1]>[BETWEEN][somewhere][EXTERNAL]'
      );

      history.undo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL]>[BETWEEN][somewhere][EXTERNAL]'
      );

      history.redo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1]>[BETWEEN][somewhere][EXTERNAL]'
      );

      history.redo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2]>[somewhere][EXTERNAL]'
      );

      history.redo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2][e3]>[somewhere][EXTERNAL]'
      );

      history.redo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4]>[EXTERNAL]'
      );

      history.redo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5]>[EXTERNAL]'
      );

      history.redo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5][e6]>[EXTERNAL]'
      );

      history.redo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5][e6][e7]>[EXTERNAL]'
      );

      history.redo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5][e6][e7][e8]>[EXTERNAL]'
      );

      history.redo();
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL][e1]>[e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]'
      );

      expect(history.local.toString()).toStrictEqual('(72 -> 63)[0 - 13, 23 - 71]');
      expect(history.submitted.toString()).toStrictEqual('(72 -> 72)[0 - 71]');
      expect(history.server.toString()).toStrictEqual(
        '(0 -> 72)["[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]"]'
      );
    });
  });

  it('handles undo, redo of local changes', () => {
    const { client } = helper;

    client.A.insertText('hello world');
    client.A.setCaretFromValue('hello >world');
    client.A.insertText('between ');
    client.A.submitChangesInstant();

    expect(client.A.valueWithSelection()).toStrictEqual('hello between >world');
    client.A.service.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello >world');
    client.A.setCaretPosition(0);
    client.A.service.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello between >world');

    client.B.setCaretPosition(0);
    client.B.insertText('ALL: ');
    client.B.submitChangesInstant();

    helper.expectTextsConverged('ALL: [1>]hello between [0>]world');

    client.A.setCaretPosition(-1);
    client.A.service.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: hello >world');
    client.A.service.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: >');
    client.A.service.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: hello world>');
    client.A.service.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: hello between >world');
  });

  it('can undo (with history restore) after receiving external changes', () => {
    const { client } = helper;

    client.A.insertText('[B][A][C]');
    client.A.submitChangesInstant();
    client.A.selectionRange.set(6);
    client.A.insertText('[a1]');
    client.A.submitChangesInstant();

    client.A.resetHistory();

    client.B.selectionRange.set(3);
    client.B.insertText('[b1]');
    client.B.submitChangesInstant();

    expect(client.A.valueWithSelection()).toStrictEqual('[B][b1][A][a1]>[C]');
    client.A.service.undo();

    expect(client.A.valueWithSelection()).toStrictEqual('[B][b1][A]>[C]');
  });

  it('can undo (with history restore) between receiving external changes', () => {
    const { client } = helper;

    client.A.insertText('[B][A][C]');
    client.A.submitChangesInstant();
    client.A.selectionRange.set(6);
    client.A.insertText('[a1]');
    client.A.submitChangesInstant();
    client.A.insertText('[a2]');
    client.A.submitChangesInstant();
    client.A.resetHistory();

    client.B.selectionRange.set(3);
    client.B.insertText('[b1]');
    client.B.submitChangesInstant();

    client.A.service.undo();

    client.B.insertText('[b2]');
    client.B.submitChangesInstant();

    client.A.service.undo();

    expect(client.A.valueWithSelection()).toStrictEqual('[B][b1][b2][A]>[C]');
  });
});
