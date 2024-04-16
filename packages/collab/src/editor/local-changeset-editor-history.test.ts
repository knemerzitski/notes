import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '../changeset/changeset';
import {
  ChangeSource,
  CollabClient,
  Events as CollabClientEvents,
} from '../client/collab-client';
import { textWithSelection } from '../test/helpers/text-with-selection';

import { ChangesetEditor } from './changeset-editor';
import { LocalChangesetEditorHistory } from './local-changeset-editor-history';
import { SelectionRange } from './selection-range';

const cs = (...values: unknown[]) => Changeset.parseValue(values);

let textValue = '';

let client: CollabClient;
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

function handleViewChanged({ view, change, source }: CollabClientEvents['viewChanged']) {
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
  client = new CollabClient();
  client.eventBus.on('viewChanged', handleViewChanged);
  history = new LocalChangesetEditorHistory({
    client: client,
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

describe('text external change entries modification', () => {
  it('inserts to start and end', () => {
    editor.insert('[e0]');
    client.submitChanges();
    client.submittedChangesAcknowledged();
    editor.insert('[e1]');
    client.submitChanges();
    editor.insert('[e2]');
    expect(textValueWithSelection()).toStrictEqual('[e0][e1][e2]>');

    client.handleExternalChange(cs('[EXTERNAL]', [0, 3], '[EXTERNAL]'));
    expect(textValueWithSelection()).toStrictEqual('[EXTERNAL][e0][e1][e2]>[EXTERNAL]');

    expectHistoryUndoRedoRestoreValue();
    expectHistoryBaseValue('[EXTERNAL]>[EXTERNAL]');
  });

  it('local and external delete same value', () => {
    editor.insert('[e0]');
    editor.insert('[e1]');
    client.submitChanges();
    client.submittedChangesAcknowledged();
    editor.insert('[e2]');
    client.submitChanges();
    editor.insert('[e3]');
    expect(textValueWithSelection()).toStrictEqual('[e0][e1][e2][e3]>');

    selection.setPosition(4);
    editor.deleteCount(4);
    expect(textValueWithSelection()).toStrictEqual('>[e1][e2][e3]');

    client.handleExternalChange(cs('[EXTERNAL]', [4, 7], '[EXTERNAL]'));
    expect(textValueWithSelection()).toStrictEqual('[EXTERNAL]>[e1][e2][e3][EXTERNAL]');

    selection.setPosition(22);
    expectHistoryUndoRedoRestoreValue();
    expectHistoryBaseValue('[EXTERNAL]>[EXTERNAL]');
  });

  it('local and external delete same value with more entries and between', () => {
    editor.insert('[e0]');
    editor.insert('[e1]');
    editor.insert('[e2]');
    client.submitChanges();
    client.submittedChangesAcknowledged();
    editor.insert('[e3]');
    editor.insert('[e4]');
    editor.insert('[e5]');
    client.submitChanges();
    editor.insert('[e6]');
    editor.insert('[e7]');
    editor.insert('[e8]');
    expect(textValueWithSelection()).toStrictEqual(
      '[e0][e1][e2][e3][e4][e5][e6][e7][e8]>'
    );

    selection.setPosition(4);
    editor.deleteCount(4);
    expect(textValueWithSelection()).toStrictEqual('>[e1][e2][e3][e4][e5][e6][e7][e8]');

    client.handleExternalChange(
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
    client.submitChanges();
    client.submittedChangesAcknowledged();
    editor.insert('[e3]');
    editor.insert('[e4]');
    editor.insert('[e5]');
    client.submitChanges();
    editor.insert('[e6]');
    editor.insert('[e7]');
    editor.insert('[e8]');
    expect(textValueWithSelection()).toStrictEqual(
      '[e0][e1][e2][e3][e4][e5][e6][e7][e8]>'
    );

    selection.setPosition(4);
    editor.deleteCount(4);
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

    expect(client.local.toString()).toStrictEqual('(72 -> 63)[0 - 13, 23 - 71]');
    expect(client.submitted.toString()).toStrictEqual('(72 -> 72)[0 - 71]');
    expect(client.server.toString()).toStrictEqual(
      '(0 -> 72)["[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]"]'
    );
  });
});
