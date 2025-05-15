import { beforeEach, describe, expect, it } from 'vitest';
import { createCollabSandbox } from './helpers/collab-sandbox';
import { Changeset } from '../common/changeset';
import { Selection } from '../common/selection';

type Client = ReturnType<typeof createCollabSandbox>['client'][string];

const cs = Changeset.parse;

it('local deletion undo and redo', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('a');
  A.insert('b');

  expect(A.getViewTextWithSelection()).toStrictEqual('ab│');

  A.delete();
  expect(A.getViewTextWithSelection()).toStrictEqual('a│');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('ab│');

  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('a│');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('ab│');

  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('a│');
});

it('undo re-inserts what was deleted later', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('a');
  A.insert('b');
  A.insert('c');

  A.setCaret(1);
  A.delete();

  expect(A.getViewTextWithSelection()).toStrictEqual('│bc');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('a│bc');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('ab│');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('a│');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('│');
});

it('can undo and redo after permanent typing', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('a');
  A.insert('b');

  A.insert('c', {
    historyType: 'permanent',
  });

  expect(A.viewText).toStrictEqual('abc');

  A.undo();
  expect(A.viewText).toStrictEqual('ac');

  A.undo();
  expect(A.viewText).toStrictEqual('c');

  A.redo();
  expect(A.viewText).toStrictEqual('ac');

  A.redo();
  expect(A.viewText).toStrictEqual('abc');
});

it('can undo and redo after permanent typing with selection', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('a');
  A.insert('b');

  A.insert('c', {
    historyType: 'permanent',
  });

  expect(A.getViewTextWithSelection()).toStrictEqual('abc│');

  A.undo();
  // TODO fix
  // expect(A.getViewTextWithSelection()).toStrictEqual('a│c'); // correct
  expect(A.getViewTextWithSelection()).toStrictEqual('ac│');

  A.undo();
  // TODO fix
  // expect(A.getViewTextWithSelection()).toStrictEqual('│c'); // correct
  expect(A.getViewTextWithSelection()).toStrictEqual('c│');

  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('a│c');

  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('ab│c');
});

it('can undo and redo after multiple permanent typings', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('a');
  A.insert('b');
  A.submitChangesInstant();

  A.undo();
  expect(A.viewText).toStrictEqual('a');

  A.setCaret(0);
  A.insert('<', {
    historyType: 'permanent',
  });
  A.setCaret(-1);
  A.insert('>', {
    historyType: 'permanent',
  });

  expect(A.viewText).toStrictEqual('<a>');

  A.undo();
  expect(A.viewText).toStrictEqual('<>');

  A.redo();
  expect(A.viewText).toStrictEqual('<a>');

  A.redo();
  expect(A.viewText).toStrictEqual('<ab>');
});

it('can undo and redo after multiple permanent typings with selection', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('a');
  A.insert('b');
  A.submitChangesInstant();

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('a│');

  A.setCaret(0);
  A.insert('<', {
    historyType: 'permanent',
  });
  A.setCaret(-1);
  A.insert('>', {
    historyType: 'permanent',
  });

  expect(A.getViewTextWithSelection()).toStrictEqual('<a>│');

  A.undo();
  // TODO Fix
  // expect(A.getViewTextWithSelection()).toStrictEqual('<│>'); // correct
  expect(A.getViewTextWithSelection()).toStrictEqual('<>│');

  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('<a│>');

  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('<ab│>');
});

it('undo, redo retains selection', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('hello world');
  A.setCaret(6);
  A.insert('between ');
  A.setCaret(6, 13);
  expect(A.getViewTextWithSelection()).toStrictEqual('hello │between│ world');

  A.delete();
  expect(A.getViewTextWithSelection()).toStrictEqual('hello │ world');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('hello │between│ world');
  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('hello │ world');
});

describe('text external change records modification', () => {
  let A: ReturnType<typeof createCollabSandbox>['client'][string];
  let B: ReturnType<typeof createCollabSandbox>['client'][string];

  beforeEach(() => {
    const sandbox = createCollabSandbox({
      clients: ['A', 'B'],
    });
    A = sandbox.client.A;
    B = sandbox.client.B;
  });

  function textValueWithSelection() {
    return A.getViewTextWithSelection();
  }

  /**
   * Goes through history each entry undo/redo and checks if value stays the same.
   */
  function expectHistoryUndoRedoRestoreValue(selection: boolean) {
    let expected = selection ? A.getViewTextWithSelection() : A.viewText;
    const historySize = A.historySize;
    let i = 0;
    for (; i < historySize; i++) {
      A.undo();
      const undoValue = selection ? A.getViewTextWithSelection() : A.viewText;
      if (undoValue === expected) break;
      A.redo();
      const redoValue = selection ? A.getViewTextWithSelection() : A.viewText;

      expect(redoValue, 'Redo/undo are not inverse').toStrictEqual(expected);
      expected = undoValue;
      A.undo();
    }

    for (; i >= 0; i--) {
      A.redo();
    }
  }

  function expectHistoryBaseValue(expectedValue: string) {
    const historySize = A.historySize;
    let i = 0;
    for (; i < historySize; i++) {
      A.undo();
    }
    expect(textValueWithSelection()).toStrictEqual(expectedValue);

    for (; i >= 0; i--) {
      A.redo();
    }
  }

  it('inserts to start and end', () => {
    A.insert('[e0]');
    A.submitChangesInstant();
    A.insert('[e1]');
    A.submitChanges();
    A.insert('[e2]');
    expect(textValueWithSelection()).toStrictEqual('[e0][e1][e2]│');

    B.insert('[EXTERNAL]');
    B.setCaret(-1);
    B.insert('[EXTERNAL]');
    B.submitChangesInstant();

    expect(textValueWithSelection()).toStrictEqual('[EXTERNAL][e0][EXTERNAL][e1][e2]│');

    expectHistoryUndoRedoRestoreValue(false);
    // TODO fix
    // expectHistoryBaseValue('[EXTERNAL]│[EXTERNAL]'); // correct
    expectHistoryBaseValue('[EXTERNAL][EXTERNAL]│');
  });

  it('local and external delete same value', () => {
    A.insert('[e0]');
    A.insert('[e1]');
    A.submitChangesInstant();
    A.insert('[e2]');
    A.submitChanges();
    A.insert('[e3]');
    expect(textValueWithSelection()).toStrictEqual('[e0][e1][e2][e3]│');

    A.setCaret(4);
    A.delete(4);
    expect(textValueWithSelection()).toStrictEqual('│[e1][e2][e3]');

    B.setCaret(4);
    B.delete(4);
    B.insert('[EXTERNAL]');
    B.setCaret(-1);
    B.insert('[EXTERNAL]');
    B.submitChangesInstant();

    expect(textValueWithSelection()).toStrictEqual('[EXTERNAL]│[e1][EXTERNAL][e2][e3]');

    A.setCaret(32);
    expectHistoryUndoRedoRestoreValue(false);
    // expectHistoryBaseValue('[EXTERNAL]│[EXTERNAL]'); // correct
    expectHistoryBaseValue('[EXTERNAL][EXTERNAL]│');
  });

  it('local and external delete same value with more records and between', () => {
    A.insert('[e0]');
    A.insert('[e1]');
    A.insert('[e2]');
    A.submitChangesInstant();
    A.insert('[e3]');
    A.insert('[e4]');
    A.insert('[e5]');
    A.submitChanges();
    A.insert('[e6]');
    A.insert('[e7]');
    A.insert('[e8]');
    expect(textValueWithSelection()).toStrictEqual(
      '[e0][e1][e2][e3][e4][e5][e6][e7][e8]│'
    );

    A.setCaret(4);
    A.delete(4);
    expect(textValueWithSelection()).toStrictEqual('│[e1][e2][e3][e4][e5][e6][e7][e8]');

    B.setCaret(4);
    B.delete(4);
    B.insert('[EXTERNAL]');
    B.setCaret(14);
    B.insert('[BETWEEN]');
    B.setCaret(-1);
    B.insert('[EXTERNAL]');
    B.submitChangesInstant();

    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL]│[e1][BETWEEN][e2][EXTERNAL][e3][e4][e5][e6][e7][e8]'
    );

    A.setCaret(51);
    expectHistoryUndoRedoRestoreValue(false);
    // expectHistoryBaseValue('[EXTERNAL]│[BETWEEN][EXTERNAL]'); // correct
    expectHistoryBaseValue('[EXTERNAL][BETWEEN][EXTERNAL]│');
  });

  it('multiple external changes value manual check', () => {
    A.insert('[e0]');
    A.insert('[e1]');
    A.insert('[e2]');
    A.submitChangesInstant();
    A.insert('[e3]');
    A.insert('[e4]');
    A.insert('[e5]');
    const submitted = A.submitChanges();
    A.insert('[e6]');
    A.insert('[e7]');
    A.insert('[e8]');
    expect(textValueWithSelection()).toStrictEqual(
      '[e0][e1][e2][e3][e4][e5][e6][e7][e8]│'
    );

    A.setCaret(4);
    A.delete(4);
    expect(textValueWithSelection()).toStrictEqual('│[e1][e2][e3][e4][e5][e6][e7][e8]');

    B.setCaret(4);
    B.delete(4);
    B.insert('[EXTERNAL]');
    B.setCaret(14);
    B.insert('[BETWEEN]');
    B.setCaret(-1);
    B.insert('[EXTERNAL]');
    B.submitChangesInstant();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL]│[e1][BETWEEN][e2][EXTERNAL][e3][e4][e5][e6][e7][e8]'
    );

    submitted.serverReceive().acknowledgeAndSendToOtherClients();
    A.submitChangesInstant();

    B.setCaret(41);
    B.insert('[somewhere]');
    B.submitChangesInstant();

    A.setCaret(23);
    A.delete(9);

    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e1]│[e2][EXTERNAL][e3][somewhere][e4][e5][e6][e7][e8]'
    );

    A.undo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e1][BETWEEN]│[e2][EXTERNAL][e3][somewhere][e4][e5][e6][e7][e8]'
    );

    A.undo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0]│[e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4][e5][e6][e7][e8]'
    );

    A.undo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4][e5][e6][e7]│'
    );

    A.undo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4][e5][e6]│'
    );

    A.undo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4][e5]│'
    );

    A.undo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4]│'
    );

    A.undo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL][e3][somewhere]│'
    );

    A.undo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL]│[somewhere]'
    );

    A.undo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][EXTERNAL]│[somewhere]'
    );

    A.undo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][BETWEEN][EXTERNAL]│[somewhere]'
    );

    A.redo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1]│[BETWEEN][EXTERNAL][somewhere]'
    );

    A.redo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2]│[EXTERNAL][somewhere]'
    );

    A.redo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL][e3]│[somewhere]'
    );

    A.redo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4]│'
    );

    A.redo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4][e5]│'
    );

    A.redo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4][e5][e6]│'
    );

    A.redo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4][e5][e6][e7]│'
    );

    A.redo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e0][e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4][e5][e6][e7][e8]│'
    );

    A.redo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL]│[e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4][e5][e6][e7][e8]'
    );

    A.redo();
    expect(textValueWithSelection()).toStrictEqual(
      '[EXTERNAL][e1]│[e2][EXTERNAL][e3][somewhere][e4][e5][e6][e7][e8]'
    );

    expect(A.localChanges.toString()).toStrictEqual(cs('72:0-13,23-71').toString());
    expect(A.submittedChanges.toString()).toStrictEqual(cs('72:0-71').toString());
    expect(A.serverText.toString()).toStrictEqual(
      '(0 -> 72)["[EXTERNAL][e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4][e5][e6][e7][e8]"]'
    );
  });
});

it('handles undo, redo of local changes', () => {
  const {
    server,
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('hello world');
  A.setCaret(6);
  A.insert('between ');
  A.submitChangesInstant();

  expect(A.getViewTextWithSelection()).toStrictEqual('hello between │world');
  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('hello │world');
  A.setCaret(0);
  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('hello between │world');

  B.setCaret(0);
  B.insert('ALL: ');
  B.submitChangesInstant();

  expect(server.getViewTextWithSelections()).toMatchInlineSnapshot(`
    [
      "ALL: │B▾hello between │A▾world",
    ]
  `);

  A.setCaret(-1);
  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('ALL: hello │world');
  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('ALL: │');
  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('ALL: hello world│');
  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('ALL: hello between │world');
});

it('can undo (with history restore) after receiving external changes', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('[B][A][C]');
  A.submitChangesInstant();
  A.setCaret(6);
  A.insert('[a1]');
  A.submitChangesInstant();

  A.reset();

  expect(A.canUndo()).toBeTruthy();

  B.setCaret(3);
  B.insert('[b1]');
  B.submitChangesInstant();

  expect(A.getViewTextWithSelection()).toStrictEqual('[B][b1][A][a1]│[C]');
  A.undo();
  expect(A.canUndo()).toBeTruthy();

  expect(A.getViewTextWithSelection()).toStrictEqual('[B][b1][A]│[C]');

  A.undo();
  expect(A.canUndo()).toBeFalsy();
});

it('can undo (with history restore) between receiving external changes', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('[B][A][C]');
  A.submitChangesInstant();
  A.setCaret(6);
  A.insert('[a1]');
  A.submitChangesInstant();
  A.insert('[a2]');
  A.submitChangesInstant();

  A.reset();

  B.setCaret(3);
  B.insert('[b1]');
  B.submitChangesInstant();
  expect(A.getViewTextWithSelection()).toStrictEqual('[B][b1][A][a1][a2]│[C]');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('[B][b1][A][a1]│[C]');

  B.insert('[b2]');
  B.submitChangesInstant();

  expect(A.getViewTextWithSelection()).toStrictEqual('[B][b1][b2][A][a1]│[C]');

  A.undo();

  expect(A.getViewTextWithSelection()).toStrictEqual('[B][b1][b2][A]│[C]');
});

it('limits historySize by deleting from undoStack', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
    client: {
      service: {
        context: {
          historySizeLimit: 2,
          arrayCleanupThreshold: 1,
        },
      },
    },
  });

  A.insert('a');
  A.submitChangesInstant();
  expect(A.historySize).toStrictEqual(2);

  A.insert('b');
  expect(A.historySize).toStrictEqual(3);

  A.insert('c');
  expect(A.historySize).toStrictEqual(3);

  A.submitChangesInstant();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"abc│"`);
  expect(A.canUndo()).toBeTruthy();
  expect(A.historySize).toStrictEqual(3);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"ab│"`);
  expect(A.canUndo()).toBeTruthy();
  expect(A.historySize).toStrictEqual(2);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);
  expect(A.historySize).toStrictEqual(0);
  expect(A.canUndo()).toBeFalsy();
});

it('limits historySize by deleting server records and restores', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
    client: {
      service: {
        context: {
          historySizeLimit: 2,
          arrayCleanupThreshold: 1,
        },
      },
    },
  });

  A.insert('a');
  A.submitChangesInstant();
  expect(A.historySize).toStrictEqual(2);
  A.reset();

  A.insert('b');
  A.submitChangesInstant();
  expect(A.historySize).toStrictEqual(2);

  A.insert('c');
  A.submitChangesInstant();
  expect(A.historySize).toStrictEqual(3);

  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"abc│"`);
  expect(A.canUndo()).toBeTruthy();
  expect(A.historySize).toStrictEqual(3);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"ab│"`);
  expect(A.canUndo()).toBeTruthy();
  expect(A.historySize).toStrictEqual(2);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);
  expect(A.historySize).toStrictEqual(1);
  expect(A.canUndo()).toBeTruthy();

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"│"`);
  expect(A.historySize).toStrictEqual(0);
  expect(A.canUndo()).toBeFalsy();
});

it('canUndo considers restorable records', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
    client: {
      service: {
        context: {
          historySizeLimit: 2,
          arrayCleanupThreshold: 1,
        },
      },
    },
  });

  A.insert('a');
  A.submitChangesInstant();
  A.insert('b');
  A.submitChangesInstant();
  A.reset();
  A.insert('c');
  A.submitChangesInstant();
  A.insert('d');
  A.submitChangesInstant();

  expect(A.canUndo()).toBeTruthy();
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"abc│"`);

  expect(A.canUndo()).toBeTruthy();
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"ab│"`);

  expect(A.canUndo()).toBeTruthy();
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);

  expect(A.canUndo()).toBeTruthy();
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"│"`);

  expect(A.canUndo()).toBeFalsy();
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"│"`);
});

describe('restore identical history', () => {
  function expectIdenticalHistory(a: Client, b: Client, selection: boolean) {
    function undoToStart() {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        if (selection) {
          expect(a.getViewTextWithSelection()).toStrictEqual(
            b.getViewTextWithSelection()
          );
        } else {
          expect(a.viewText).toStrictEqual(b.viewText);
        }

        expect(a.canUndo()).toStrictEqual(b.canUndo());

        if (a.canUndo()) {
          a.undo();
          b.undo();
        } else {
          break;
        }
      }
    }

    function redoToEnd() {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        if (selection) {
          expect(a.getViewTextWithSelection()).toStrictEqual(
            b.getViewTextWithSelection()
          );
        } else {
          expect(a.viewText).toStrictEqual(b.viewText);
        }
        expect(a.canRedo()).toStrictEqual(b.canRedo());

        if (a.canRedo()) {
          a.redo();
          b.redo();
        } else {
          break;
        }
      }
    }

    undoToStart();
    redoToEnd();
    undoToStart();
    redoToEnd();
  }

  it('restores identical history from server records containing two users', () => {
    const {
      server,
      client: { A, B },
    } = createCollabSandbox({
      clients: ['A', 'B'],
    });

    A.insert('Hi from A.');
    A.submitChangesInstant();
    B.insert('Hi, im B.');
    B.submitChangesInstant();
    A.setCaret(-1);
    A.insert('[A_END]');
    A.submitChangesInstant();
    A.setCaret(0);
    A.insert('[A_START]');
    A.submitChangesInstant();
    B.setCaret(0);
    B.insert('[Bstart]');
    B.submitChangesInstant();
    B.setCaret(17);
    B.delete(9);
    B.submitChangesInstant();
    B.setCaret(27);
    B.insert('[B_almost_end]');
    B.submitChangesInstant();
    A.setCaret(18);
    A.insert('Between: ');
    A.submitChangesInstant();

    const B2 = server.createClient('B2', {
      userId: 'B',
    });
    B2.setCaret(B.caret);

    expectIdenticalHistory(B, B2, false);
  });

  it('restores history that includes complete deletion of a record', () => {
    const {
      server,
      client: { A, B },
    } = createCollabSandbox({
      clients: ['A', 'B'],
    });

    B.insert('start typing in B');
    B.submitChangesInstant();
    B.setCaret(5);
    B.insert(' next');
    B.submitChangesInstant();
    A.setCaret(0);
    A.insert('[beginning by A]');
    A.submitChangesInstant();
    B.insert('BB');
    B.submitChangesInstant();
    A.setCaret(30);
    A.delete(4);
    A.submitChangesInstant();

    const B2 = server.createClient('B2', {
      userId: 'B',
    });
    B2.setCaret(B.caret);

    expectIdenticalHistory(B, B2, false);
  });
});

it('undos until server tailRecord', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    server: {
      records: [
        {
          revision: 0,
          authorId: 'A',
          idempotencyId: 'a',
          changeset: Changeset.EMPTY,
          selectionInverse: Selection.create(0),
          selection: Selection.create(0),
        },
        {
          revision: 1,
          changeset: cs('0:"1"'),
          authorId: 'A',
          idempotencyId: '1',
          selectionInverse: Selection.create(0),
          selection: Selection.create(1),
        },
        {
          revision: 2,
          changeset: cs('1:0,"23"'),
          authorId: 'A',
          idempotencyId: '2',
          selectionInverse: Selection.create(1),
          selection: Selection.create(3),
        },
      ],
    },
    clients: ['A'],
  });

  expect(A.canUndo()).toBeTruthy();
  expect(A.getViewTextWithSelection()).toStrictEqual('│123');
  expect(A.undo()).toBeTruthy();
  expect(A.getViewTextWithSelection()).toStrictEqual('1│');
  expect(A.canUndo()).toBeTruthy();
  expect(A.undo()).toBeTruthy();
  expect(A.getViewTextWithSelection()).toStrictEqual('│');
});

it('catches up to server', () => {
  const {
    server,
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.submitChangesInstant();
  A.disconnect();

  const A2 = server.createClient('A2', {
    userId: 'A',
  });
  A2.setCaret(-1);
  A2.insert('b');
  A2.submitChangesInstant();

  B.insert('[B]');
  B.submitChangesInstant();

  A.reconnect();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);

  A.catchUpToServer();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"[B]a│b"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"[B]a│"`);
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"[B]│"`);

  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"[B]a│"`);
  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"[B]ab│"`);
});
