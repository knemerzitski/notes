/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { expect, it } from 'vitest';
import { createCollabSandbox } from './helpers/collab-sandbox';
import { Changeset } from '../common/changeset';
import { Selection } from '../common/selection';

const cs = Changeset.parse;
const s = Selection.parse;

it('processes "hello world"', () => {
  const {
    server,
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"│"`);
  expect(server.headText).toMatchInlineSnapshot(`""`);

  A.insert('hello world');
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"hello world│"`);
  expect(server.headText).toMatchInlineSnapshot(`""`);

  A.submitChangesInstant();

  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"hello world│"`);
  expect(server.headText).toMatchInlineSnapshot(`"hello world"`);
});

it('emits correct events with insert, submit, undo', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
    client: {
      service: {
        context: {
          isExternalTypingHistory: () => true,
        },
      },
    },
  });

  const events: string[] = [];
  A.on('*', ({ type }) => {
    events.push(type);
  });

  A.insert('f');
  A.insert('o');
  A.insert('o', { historyType: 'merge' });
  A.insert('ooooo', { historyType: 'merge' });
  A.submitChangesInstant();
  A.undo();
  A.undo();

  expect(events).toMatchInlineSnapshot(`
    [
      "localTyping:add",
      "localTyping:applied",
      "localChanges:have",
      "view:changed",
      "localTyping:add",
      "localTyping:applied",
      "view:changed",
      "localTyping:add",
      "localTyping:applied",
      "view:changed",
      "localTyping:add",
      "localTyping:applied",
      "view:changed",
      "submittedChanges:have",
      "records:restored",
      "submittedChanges:acknowledged",
      "serverRevision:changed",
      "undo:applied",
      "localTyping:applied",
      "localChanges:have",
      "view:changed",
      "undo:applied",
      "localTyping:applied",
      "view:changed",
    ]
  `);
});

it('merges history records when historyType=merge', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('hello world');
  A.insert(' one', { historyType: 'merge' });
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"hello world one│"`);
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"│"`);
});

it('ignores merge when previous is not typing', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('1', { historyType: 'merge' });
  A.insert('3', { historyType: 'merge' });
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"13│"`);
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"│"`);
});

it('submits correct selection when undo', () => {
  const {
    client: { A },
  } = createCollabSandbox({
    server: {
      records: [
        {
          revision: 4,
          changeset: cs('0:"ZERO"'),
          authorId: '',
          idempotencyId: '',
          selectionInverse: Selection.ZERO,
          selection: Selection.ZERO,
        },
      ],
    },
    clients: ['A'],
    client: {
      service: {
        context: {
          generateSubmitId: () => 'a',
        },
      },
    },
  });

  A.insert('[a0]');
  A.insert('[a1]');
  A.insert('[a2]');
  A.submitChangesInstant();
  A.insert('[b0]');
  A.insert('[b1]');
  A.submitChangesInstant();
  A.undo();
  A.undo();

  const { submitRecord } = A.submitChanges();

  expect(submitRecord).toEqual({
    id: 'a',
    targetRevision: 6,
    changeset: cs('24:0-11,20-23'),
    selectionInverse: s('20'),
    selection: s('12'),
  });
});
