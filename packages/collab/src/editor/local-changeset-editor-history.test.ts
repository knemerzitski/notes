import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';
import {
  ChangeSource,
  DocumentClient,
  Events as DocumentClientEvents,
} from '../client/document-client';
import { textWithSelection } from '../test/helpers/text-with-selection';

import { ChangesetEditor } from './changeset-editor';
import { LocalChangesetEditorHistory } from './local-changeset-editor-history';
import { SelectionRange } from './selection-range';

const cs = (...values: unknown[]) => Changeset.parseValue(values);

describe('LocalChangesetEditorHistory', () => {
  let textValue = '';

  let document: DocumentClient;
  let history: LocalChangesetEditorHistory;

  const selection = new SelectionRange({
    getLength() {
      return textValue.length;
    },
  });

  const editor = new ChangesetEditor({
    getValue() {
      return textValue;
    },
    selection,
  });

  function handleViewChanged({
    view,
    change,
    source,
  }: DocumentClientEvents['viewChanged']) {
    textValue = view.strips.joinInsertions();
    if (source === ChangeSource.External) {
      selection.setSelectionRange(
        change.followIndex(selection.start),
        change.followIndex(selection.end)
      );
    }
  }

  beforeEach(() => {
    textValue = '';
    selection.setSelectionRange(0, 0);
    document = new DocumentClient();
    document.eventBus.on('viewChanged', handleViewChanged);
    history = new LocalChangesetEditorHistory({
      document: document,
      editorBus: editor.eventBus,
      selection,
    });
  });

  afterEach(() => {
    history.cleanUp();
  });

  function textValueWithSelection() {
    return textWithSelection(textValue, selection);
  }

  /**
   * Goes through history each entry undo/redo and checks if value stays the same.
   */
  function expectHistoryUndoRedoRestoreValue() {
    let expected = textValueWithSelection();
    let i = 0;
    for (; i < history.entryCount; i++) {
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
    for (; i < history.entryCount; i++) {
      history.undo();
    }
    expect(textValueWithSelection()).toStrictEqual(expectedValue);

    for (; i >= 0; i--) {
      history.redo();
    }
  }

  describe('document external change entries modification', () => {
    it('inserts to start and end', () => {
      editor.insert('[e0]');
      document.submitChanges();
      document.submittedChangesAcknowledged();
      editor.insert('[e1]');
      document.submitChanges();
      editor.insert('[e2]');
      expect(textValueWithSelection()).toStrictEqual('[e0][e1][e2]>');

      document.handleExternalChange(cs('[EXTERNAL]', [0, 3], '[EXTERNAL]'));
      expect(textValueWithSelection()).toStrictEqual('[EXTERNAL][e0][e1][e2]>[EXTERNAL]');

      expectHistoryUndoRedoRestoreValue();
      expectHistoryBaseValue('[EXTERNAL]>[EXTERNAL]');
    });

    it('local and external delete same value', () => {
      editor.insert('[e0]');
      editor.insert('[e1]');
      document.submitChanges();
      document.submittedChangesAcknowledged();
      editor.insert('[e2]');
      document.submitChanges();
      editor.insert('[e3]');
      expect(textValueWithSelection()).toStrictEqual('[e0][e1][e2][e3]>');

      selection.setPosition(4);
      editor.deleteCount(4);
      expect(textValueWithSelection()).toStrictEqual('>[e1][e2][e3]');

      document.handleExternalChange(cs('[EXTERNAL]', [4, 7], '[EXTERNAL]'));
      expect(textValueWithSelection()).toStrictEqual('[EXTERNAL]>[e1][e2][e3][EXTERNAL]');

      selection.setPosition(22);
      expectHistoryUndoRedoRestoreValue();
      expectHistoryBaseValue('[EXTERNAL]>[EXTERNAL]');
    });

    it('local and external delete same value with more entries and between', () => {
      editor.insert('[e0]');
      editor.insert('[e1]');
      editor.insert('[e2]');
      document.submitChanges();
      document.submittedChangesAcknowledged();
      editor.insert('[e3]');
      editor.insert('[e4]');
      editor.insert('[e5]');
      document.submitChanges();
      editor.insert('[e6]');
      editor.insert('[e7]');
      editor.insert('[e8]');
      expect(textValueWithSelection()).toStrictEqual(
        '[e0][e1][e2][e3][e4][e5][e6][e7][e8]>'
      );

      selection.setPosition(4);
      editor.deleteCount(4);
      expect(textValueWithSelection()).toStrictEqual('>[e1][e2][e3][e4][e5][e6][e7][e8]');

      document.handleExternalChange(
        cs('[EXTERNAL]', [4, 7], '[BETWEEN]', [8, 11], '[EXTERNAL]')
      );
      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL]>[e1][BETWEEN][e2][e3][e4][e5][e6][e7][e8][EXTERNAL]'
      );

      selection.setPosition(51);
      expectHistoryUndoRedoRestoreValue();
      expectHistoryBaseValue('[EXTERNAL]>[BETWEEN][EXTERNAL]');
    });

    it('multiple external changes value manual check', () => {
      editor.insert('[e0]');
      editor.insert('[e1]');
      editor.insert('[e2]');
      document.submitChanges();
      document.submittedChangesAcknowledged();
      editor.insert('[e3]');
      editor.insert('[e4]');
      editor.insert('[e5]');
      document.submitChanges();
      editor.insert('[e6]');
      editor.insert('[e7]');
      editor.insert('[e8]');
      expect(textValueWithSelection()).toStrictEqual(
        '[e0][e1][e2][e3][e4][e5][e6][e7][e8]>'
      );

      selection.setPosition(4);
      editor.deleteCount(4);
      expect(textValueWithSelection()).toStrictEqual('>[e1][e2][e3][e4][e5][e6][e7][e8]');

      document.handleExternalChange(
        cs('[EXTERNAL]', [4, 7], '[BETWEEN]', [8, 11], '[EXTERNAL]')
      );

      expect(textValueWithSelection()).toStrictEqual(
        '[EXTERNAL]>[e1][BETWEEN][e2][e3][e4][e5][e6][e7][e8][EXTERNAL]'
      );

      document.submittedChangesAcknowledged();
      document.submitChanges();
      document.submittedChangesAcknowledged();

      document.handleExternalChange(cs([0, 30], '[somewhere]', [31, 60]));

      selection.setPosition(23);
      editor.deleteCount(9);

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

      expect(document.local.toString()).toStrictEqual('(72 -> 63)[0 - 13, 23 - 71]');
      expect(document.submitted.toString()).toStrictEqual('(72 -> 72)[0 - 71]');
      expect(document.server.toString()).toStrictEqual(
        '(0 -> 72)["[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]"]'
      );
    });
  });

  describe('prepend', () => {
    it('prepends 3 entries', () => {
      document.handleExternalChange(Changeset.parseValue(['abc']));

      const base = Changeset.EMPTY;
      const a = Changeset.parseValue(['a']);
      const b = Changeset.parseValue([0, 'b']);
      const c = Changeset.parseValue([[0, 1], 'c']);

      editor.insert('|my change');

      expect(document.view.joinInsertions()).toStrictEqual('abc|my change');
      history.prepend(base, [a, b, c]);
      expect(document.view.joinInsertions()).toStrictEqual('abc|my change');

      history.undo();
      expect(document.view.joinInsertions()).toStrictEqual('abc');
      history.undo();
      expect(document.view.joinInsertions()).toStrictEqual('ab');
      history.undo();
      expect(document.view.joinInsertions()).toStrictEqual('a');
      history.undo();
      expect(document.view.joinInsertions()).toStrictEqual('');
      history.redo();
      expect(document.view.joinInsertions()).toStrictEqual('a');
      history.redo();
      expect(document.view.joinInsertions()).toStrictEqual('ab');
      history.redo();
      expect(document.view.joinInsertions()).toStrictEqual('abc');
      history.redo();
      expect(document.view.joinInsertions()).toStrictEqual('abc|my change');
    });

    it('keeps external change with change swap', () => {
      document.handleExternalChange(Changeset.parseValue(['abc']));

      const a = Changeset.parseValue(['a']);
      const bExternal = Changeset.parseValue([0, 'b']);
      const c = Changeset.parseValue([[0, 1], 'c']);
      const [_bExternal, _a] = Changeset.EMPTY.swapChanges(a, bExternal);

      const base = _bExternal;

      editor.insert('|my change');

      expect(document.view.joinInsertions()).toStrictEqual('abc|my change');
      history.prepend(base, [_a, c]);
      expect(document.view.joinInsertions()).toStrictEqual('abc|my change');

      history.undo();
      expect(document.view.joinInsertions()).toStrictEqual('abc');
      history.undo();
      expect(document.view.joinInsertions()).toStrictEqual('ab');
      history.undo();
      expect(document.view.joinInsertions()).toStrictEqual('b');
      history.undo();
      expect(document.view.joinInsertions()).toStrictEqual('b');
      history.redo();
      expect(document.view.joinInsertions()).toStrictEqual('ab');
      history.redo();
      expect(document.view.joinInsertions()).toStrictEqual('abc');
      history.redo();
      expect(document.view.joinInsertions()).toStrictEqual('abc|my change');
    });
  });
});
