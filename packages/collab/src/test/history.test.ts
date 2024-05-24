import { beforeEach, describe, expect, it } from 'vitest';

import { createHelperCollabEditingEnvironment } from './helpers/server-client';
import { Changeset } from '../changeset/changeset';
import { CollabClient } from '../client/collab-client';
import { CollabHistory } from '../client/collab-history';

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

    client.A.editor.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello >between< world');
    client.A.editor.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello > world');
  });

  describe('text external change entries modification', () => {
    let history: CollabHistory;
    let client: CollabClient;

    beforeEach(() => {
      history = helper.client.A.history;
      client = helper.client.A.client;
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
      for (; i < history.entries.length; i++) {
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
      for (; i < history.entries.length; i++) {
        history.undo();
      }
      expect(textValueWithSelection()).toStrictEqual(expectedValue);

      for (; i >= 0; i--) {
        history.redo();
      }
    }

    it('inserts to start and end', () => {
      helper.client.A.insertText('[e0]');
      client.submitChanges();
      client.submittedChangesAcknowledged();
      helper.client.A.insertText('[e1]');
      client.submitChanges();
      helper.client.A.insertText('[e2]');
      expect(textValueWithSelection()).toStrictEqual('[e0][e1][e2]>');

      client.handleExternalChange(cs('[EXTERNAL]', [0, 3], '[EXTERNAL]'));
      expect(textValueWithSelection()).toStrictEqual('[EXTERNAL][e0][e1][e2]>[EXTERNAL]');

      expectHistoryUndoRedoRestoreValue();
      expectHistoryBaseValue('[EXTERNAL]>[EXTERNAL]');
    });

    it('local and external delete same value', () => {
      helper.client.A.insertText('[e0]');
      helper.client.A.insertText('[e1]');
      client.submitChanges();
      client.submittedChangesAcknowledged();
      helper.client.A.insertText('[e2]');
      client.submitChanges();
      helper.client.A.insertText('[e3]');
      expect(textValueWithSelection()).toStrictEqual('[e0][e1][e2][e3]>');

      helper.client.A.setCaretPosition(4);
      helper.client.A.deleteTextCount(4);
      expect(textValueWithSelection()).toStrictEqual('>[e1][e2][e3]');

      client.handleExternalChange(cs('[EXTERNAL]', [4, 7], '[EXTERNAL]'));
      expect(textValueWithSelection()).toStrictEqual('[EXTERNAL]>[e1][e2][e3][EXTERNAL]');

      helper.client.A.setCaretPosition(22);
      expectHistoryUndoRedoRestoreValue();
      expectHistoryBaseValue('[EXTERNAL]>[EXTERNAL]');
    });

    it('local and external delete same value with more entries and between', () => {
      helper.client.A.insertText('[e0]');
      helper.client.A.insertText('[e1]');
      helper.client.A.insertText('[e2]');
      client.submitChanges();
      client.submittedChangesAcknowledged();
      helper.client.A.insertText('[e3]');
      helper.client.A.insertText('[e4]');
      helper.client.A.insertText('[e5]');
      client.submitChanges();
      helper.client.A.insertText('[e6]');
      helper.client.A.insertText('[e7]');
      helper.client.A.insertText('[e8]');
      expect(textValueWithSelection()).toStrictEqual(
        '[e0][e1][e2][e3][e4][e5][e6][e7][e8]>'
      );

      helper.client.A.setCaretPosition(4);
      helper.client.A.deleteTextCount(4);
      expect(textValueWithSelection()).toStrictEqual('>[e1][e2][e3][e4][e5][e6][e7][e8]');

      client.handleExternalChange(
        cs('[EXTERNAL]', [4, 7], '[BETWEEN]', [8, 11], '[EXTERNAL]')
      );
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL]>[e1][BETWEEN][e2][e3][e4][e5][e6][e7][e8][EXTERNAL]'
      );

      helper.client.A.setCaretPosition(51);
      expectHistoryUndoRedoRestoreValue();
      expectHistoryBaseValue('[EXTERNAL]>[BETWEEN][EXTERNAL]');
    });

    it('multiple external changes value manual check', () => {
      helper.client.A.insertText('[e0]');
      helper.client.A.insertText('[e1]');
      helper.client.A.insertText('[e2]');
      client.submitChanges();
      client.submittedChangesAcknowledged();
      helper.client.A.insertText('[e3]');
      helper.client.A.insertText('[e4]');
      helper.client.A.insertText('[e5]');
      client.submitChanges();
      helper.client.A.insertText('[e6]');
      helper.client.A.insertText('[e7]');
      helper.client.A.insertText('[e8]');
      expect(textValueWithSelection()).toStrictEqual(
        '[e0][e1][e2][e3][e4][e5][e6][e7][e8]>'
      );

      helper.client.A.setCaretPosition(4);
      helper.client.A.deleteTextCount(4);
      expect(textValueWithSelection()).toStrictEqual('>[e1][e2][e3][e4][e5][e6][e7][e8]');

      client.handleExternalChange(
        cs('[EXTERNAL]', [4, 7], '[BETWEEN]', [8, 11], '[EXTERNAL]')
      );

      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL]>[e1][BETWEEN][e2][e3][e4][e5][e6][e7][e8][EXTERNAL]'
      );

      client.submittedChangesAcknowledged();
      client.submitChanges();
      client.submittedChangesAcknowledged();

      client.handleExternalChange(cs([0, 30], '[somewhere]', [31, 60]));

      helper.client.A.setCaretPosition(23);
      helper.client.A.deleteTextCount(9);

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

      expect(client.local.toString()).toStrictEqual('(72 -> 63)[0 - 13, 23 - 71]');
      expect(client.submitted.toString()).toStrictEqual('(72 -> 72)[0 - 71]');
      expect(client.server.toString()).toStrictEqual(
        '(0 -> 72)["[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]"]'
      );
    });
  });
});

describe('two clients', () => {
  let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A' | 'B'>>;

  beforeEach(() => {
    helper = createHelperCollabEditingEnvironment({
      clientNames: ['A', 'B'],
    });
  });

  it('handles undo, redo of local changes', () => {
    const { client } = helper;

    client.A.insertText('hello world');
    client.A.setCaretFromValue('hello >world');
    client.A.insertText('between ');
    client.A.submitChangesInstant();

    expect(client.A.valueWithSelection()).toStrictEqual('hello between >world');
    client.A.editor.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello >world');
    client.A.setCaretPosition(0);
    client.A.editor.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('hello between >world');

    client.B.setCaretPosition(0);
    client.B.insertText('ALL: ');
    client.B.submitChangesInstant();

    helper.expectTextsConverted('ALL: [1>]hello between [0>]world');

    client.A.setCaretPosition(-1);
    client.A.editor.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: hello >world');
    client.A.editor.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: >');
    client.A.editor.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: hello world>');
    client.A.editor.redo();
    expect(client.A.valueWithSelection()).toStrictEqual('ALL: hello between >world');
  });
});
