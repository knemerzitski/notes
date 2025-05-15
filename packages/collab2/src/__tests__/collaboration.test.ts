/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-extraneous-class */
import { expect, it } from 'vitest';
import { createCollabSandbox } from './helpers/collab-sandbox';
import { Changeset } from '../common/changeset';
import { logAll } from '../../../utils/src/log-all';

const cs = Changeset.parse;

it('simple clients receive and process external changes', () => {
  const {
    server,
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('foo');
  A.submitChangesInstant();

  B.setCaret(3);
  B.insert('bar');
  B.submitChangesInstant();

  expect(server.getViewTextWithSelections()).toMatchInlineSnapshot(`
    [
      "foo│A▾bar│B▾",
    ]
  `);
});

it('can add client later', () => {
  const {
    server,
    client: { A },
  } = createCollabSandbox({
    clients: ['A'],
  });

  A.insert('foo');
  A.submitChangesInstant();

  const B = server.createClient('B');
  B.setCaret(3);
  B.insert('bar');
  B.submitChangesInstant();

  expect(server.getViewTextWithSelections()).toMatchInlineSnapshot(`
    [
      "foo│A▾bar│B▾",
    ]
  `);
});

it('returns same record on duplicate submit', () => {
  const {
    server,
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
    client: {
      service: {
        context: {
          generateSubmitId: () => 'a',
        },
      },
    },
  });

  A.insert('hello');
  const submit1 = A.submitChanges().serverReceive();
  const submit2 = A.submitChanges().serverReceive();

  B.setCaret(-1);
  B.insert('other');
  const submit3 = B.submitChanges().serverReceive();
  const submit4 = B.submitChanges().serverReceive();

  submit1.acknowledgeAndSendToOtherClients();
  submit2.acknowledgeAndSendToOtherClients();
  submit3.acknowledgeAndSendToOtherClients();
  submit4.acknowledgeAndSendToOtherClients();

  expect(submit1.serverResult.record.revision).toStrictEqual(1);
  expect(submit2.serverResult.record.revision).toStrictEqual(1);
  expect(submit3.serverResult.record.revision).toStrictEqual(2);
  expect(submit4.serverResult.record.revision).toStrictEqual(2);

  expect(server.records.length).toStrictEqual(2);
});

it('external changes to server are composed as retained characters in submitted and local', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('server');
  A.submitChangesInstant();
  A.insert('; submitted');
  A.submitChanges();
  A.insert('; local');
  A.insert('; more');

  B.insert('external before - ');
  B.setCaret(-1);
  B.insert(' - external after');
  B.submitChangesInstant();

  expect(A.serverText.toString()).toStrictEqual(
    cs('0:"external before - server - external after"').toString()
  );
  expect(A.submittedChanges.toString()).toStrictEqual(
    cs('41:0-40,"; submitted"').toString()
  );
  expect(A.localChanges.toString()).toStrictEqual(
    cs('52:0-51,"; local; more"').toString()
  );
  expect(A.viewText).toStrictEqual(
    'external before - server - external after; submitted; local; more'
  );

  expect(A.getViewTextWithSelection()).toStrictEqual(
    'external before - server - external after; submitted; local; more│'
  );
});

it('edits e0 to e8 with duplicate external deletion', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

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
  A.setCaret(4);
  A.delete(4);

  B.setCaret(4);
  B.delete(4);
  B.insert('[EXTERNAL]');
  B.setCaret(14);
  B.insert('[BETWEEN]');
  B.setCaret(-1);
  B.insert('[EXTERNAL]');
  B.submitChangesInstant();

  submitted.serverReceive().acknowledgeAndSendToOtherClients();
  A.submitChangesInstant();

  // Insert [somewhere] between [e3] amd [e4]
  B.setCaret(41);
  B.insert('[somewhere]');
  B.submitChangesInstant();

  // Delete [BETWEEN]
  A.setCaret(23);
  A.delete(9);

  expect(A.getViewTextWithSelection()).toStrictEqual(
    '[EXTERNAL][e1]│[e2][EXTERNAL][e3][somewhere][e4][e5][e6][e7][e8]'
  );

  expect(A.localChanges.toString()).toStrictEqual(
    '(72 -> 63)[0 - 13, -(14 - 22), 23 - 71]'
  );
  expect(A.submittedChanges.toString()).toStrictEqual('(72 -> 72)[0 - 71]');
  expect(A.serverText.toString()).toStrictEqual(
    '(0 -> 72)["[EXTERNAL][e1][BETWEEN][e2][EXTERNAL][e3][somewhere][e4][e5][e6][e7][e8]"]'
  );
});

it('converges 2 changes at the same time', () => {
  const {
    server,
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('both typing');
  B.insert('at the same time ');
  const sendingA = A.submitChanges();
  const sendingB = B.submitChanges();
  expect(server.headText).toStrictEqual('');

  const receivedB = sendingB.serverReceive();
  const receivedA = sendingA.serverReceive();
  receivedA.clientAcknowledge();
  receivedB.sendToOtherClients();
  receivedB.clientAcknowledge();
  receivedA.sendToOtherClients();

  expect(server.getViewTextWithSelections()).toMatchInlineSnapshot(`
    [
      "at the same time │B▾both typing│A▾",
    ]
  `);
});

it('converges changes from a client with a higher latency', () => {
  const {
    server,
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  B.insert('\n\n\n');
  B.submitChangesInstant();

  A.setCaret(0);
  A.insert('At start');
  const receivedA_1 = A.submitChanges().serverReceive();
  receivedA_1.clientAcknowledge();

  expect(A.getViewTextWithSelection()).toStrictEqual('At start│\n\n\n');
  expect(B.getViewTextWithSelection()).toStrictEqual('\n\n\n│');

  A.insert(' typing first');
  const receivedA_2 = A.submitChanges().serverReceive();
  B.insert('Somewhere in the');
  receivedA_2.clientAcknowledge();

  expect(A.getViewTextWithSelection()).toStrictEqual('At start typing first│\n\n\n');
  expect(B.getViewTextWithSelection()).toStrictEqual('\n\n\nSomewhere in the│');

  A.insert(' sentence.');
  const receivedA_3 = A.submitChanges().serverReceive();
  B.insert(' middle editing');
  receivedA_3.clientAcknowledge();

  expect(A.getViewTextWithSelection()).toStrictEqual(
    'At start typing first sentence.│\n\n\n'
  );
  expect(B.getViewTextWithSelection()).toStrictEqual(
    '\n\n\nSomewhere in the middle editing│'
  );

  A.insert(' Woo!');
  const receivedA_4 = A.submitChanges().serverReceive();
  B.insert(' together.');
  receivedA_4.acknowledgeAndSendToOtherClients();
  receivedA_1.sendToOtherClients();
  receivedA_3.sendToOtherClients();
  receivedA_2.sendToOtherClients();
  B.submitChangesInstant();

  expect(server.getViewTextWithSelections()).toMatchInlineSnapshot(`
    [
      "At start typing first sentence. Woo!│A▾


    Somewhere in the middle editing together.│B▾",
    ]
  `);
});

it(`handles client B messing with client A's text while they're editing`, () => {
  const {
    server,
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('Do not modify what im typing.');
  A.submitChangesInstant();

  A.insert(' Second sentence.');
  B.setCaret(3, 6);
  B.insert('always');
  let receivedA = A.submitChanges().serverReceive();
  let receivedB = B.submitChanges().serverReceive();
  receivedA.clientAcknowledge();
  receivedB.sendToOtherClients();
  receivedA.sendToOtherClients();
  receivedB.clientAcknowledge();

  expect(server.getViewTextWithSelections()).toMatchInlineSnapshot(`
    [
      "Do always│B▾ modify what im typing. Second sentence.│A▾",
    ]
  `);

  B.setCaret(0, 32);
  B.insert('Rewrote first sentence.');
  A.setCaret(0);
  A.insert('IMPORTANT: ');
  receivedA = A.submitChanges().serverReceive();
  receivedB = B.submitChanges().serverReceive();
  receivedA.clientAcknowledge();
  receivedB.sendToOtherClients();
  receivedB.clientAcknowledge();
  receivedA.sendToOtherClients();

  expect(server.getViewTextWithSelections()).toMatchInlineSnapshot(`
    [
      "IMPORTANT: │A▾Rewrote first sentence.│B▾ Second sentence.",
    ]
  `);
});

it('converges 3 changes at the same time', () => {
  const {
    server,
    client: { A, B, C },
  } = createCollabSandbox({
    clients: ['A', 'B', 'C'],
  });

  A.insert('initial document. A:, B:, C:');
  A.submitChangesInstant();

  B.setCaret(24);
  B.insert('b text');
  let receivedB = B.submitChanges().serverReceive();
  A.setCaret(20);
  A.insert('a text');
  let receivedA = A.submitChanges().serverReceive();
  C.setCaret(28);
  C.insert('c text');
  let receivedC = C.submitChanges().serverReceive();
  receivedC.acknowledgeAndSendToOtherClients();
  receivedA.acknowledgeAndSendToOtherClients();
  receivedB.acknowledgeAndSendToOtherClients();

  expect(server.getViewTextWithSelections()).toMatchInlineSnapshot(`
    [
      "initial document. A:a text│A▾, B:b text│B▾, C:c text│C▾",
    ]
  `);

  C.setCaret(16);
  C.insert(' extra');
  receivedC = C.submitChanges().serverReceive();
  A.delete(4);
  A.insert('number');
  receivedA = A.submitChanges().serverReceive();
  B.setCaret(2);
  B.delete(2);
  B.insert('without "in" here:');
  receivedB = B.submitChanges().serverReceive();
  receivedB.acknowledgeAndSendToOtherClients();
  receivedC.acknowledgeAndSendToOtherClients();
  receivedA.acknowledgeAndSendToOtherClients();

  expect(server.getViewTextWithSelections()).toMatchInlineSnapshot(`
    [
      "without "in" here:│B▾itial document extra│C▾. A:a number│A▾, B:b text, C:c text",
    ]
  `);
});

it('merges local typings while receiving external changes', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.submitChangesInstant();

  B.insert('A');
  B.submitChangesInstant();

  A.insert('b', {
    historyType: 'merge',
  });

  A.submitChangesInstant();

  expect(A.viewText).toMatchInlineSnapshot(`"Aab"`);
  A.undo();
  expect(A.viewText).toMatchInlineSnapshot(`"A"`);
});

it('merges local typings while receiving external changes with multiple undoStack recordss', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('0');
  A.insert('a');
  A.submitChangesInstant();

  B.insert('A');
  B.submitChangesInstant();

  A.insert('b', {
    historyType: 'merge',
  });

  A.submitChangesInstant();

  expect(A.viewText).toMatchInlineSnapshot(`"A0ab"`);
  A.undo();
  expect(A.viewText).toMatchInlineSnapshot(`"A0"`);
  A.undo();
  expect(A.viewText).toMatchInlineSnapshot(`"A"`);
});

it('merges local typings after receiving external changes', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.submitChangesInstant();

  A.insert('b', {
    historyType: 'merge',
  });

  B.insert('A');
  B.submitChangesInstant();

  A.submitChangesInstant();

  expect(A.viewText).toMatchInlineSnapshot(`"Aab"`);
  A.undo();
  expect(A.viewText).toMatchInlineSnapshot(`"A"`);
});

it('can redo while submitted is undo and receiving external change', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.submitChangesInstant();

  A.insert('b');
  A.submitChangesInstant();

  A.undo();
  A.submitChanges();

  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);

  B.setCaret(-1);
  B.insert('c');
  B.submitChangesInstant();

  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│c"`);

  A.redo();

  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"ab│c"`);
});

it('same userId with different clients external typing is part of same history', () => {
  const {
    server,
    client: { A },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.submitChangesInstant();

  A.insert('b');
  A.submitChangesInstant();

  A.undo();
  A.submitChanges();

  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);

  const A2 = server.createClient('A2', {
    userId: 'A',
  });
  A2.setCaret(-1);
  A2.insert('c');
  A2.submitChangesInstant();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│c"`);

  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"ab│c"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│c"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"a│"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"│"`);
});

it('own changes from different client are part of history when already received external changes', () => {
  const {
    server,
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.submitChangesInstant();
  A.insert('b');
  A.submitChangesInstant();
  A.undo();
  A.submitChanges();
  B.insert('A');
  B.submitChangesInstant();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"Aa│"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A│"`);

  const A2 = server.createClient('A2', {
    userId: 'A',
  });
  A2.setCaret(-1);
  A2.insert('c');
  A2.submitChangesInstant();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A│c"`);

  A2.setCaret(-1);
  A2.insert('d');
  A2.submitChangesInstant();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A│cd"`);

  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"Aa│cd"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A│cd"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"Ac│"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A│"`);
});

it('undo reinserts what was deleted later while external change with selection', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.insert('b');
  A.insert('c');

  A.setCaret(1);
  A.delete();
  expect(A.getViewTextWithSelection()).toStrictEqual('│bc');

  B.insert('B');
  B.submitChangesInstant();

  expect(A.getViewTextWithSelection()).toStrictEqual('B│bc');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('Ba│bc');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('Bab│');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('Ba│');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('B│');
});

it('undo reinserts what was deleted later while external change', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.insert('b');
  A.insert('c');

  A.setCaret(1);
  A.delete();
  expect(A.viewText).toStrictEqual('bc');

  B.insert('B');
  B.submitChangesInstant();

  expect(A.viewText).toStrictEqual('Bbc');

  A.undo();
  expect(A.viewText).toStrictEqual('Babc');

  A.undo();
  expect(A.viewText).toStrictEqual('Bab');

  A.undo();
  expect(A.viewText).toStrictEqual('Ba');

  A.undo();
  expect(A.viewText).toStrictEqual('B');

  A.redo();
  expect(A.viewText).toStrictEqual('Ba');

  A.redo();
  expect(A.viewText).toStrictEqual('Bab');

  A.redo();
  expect(A.viewText).toStrictEqual('Babc');

  A.redo();
  expect(A.viewText).toStrictEqual('Bbc');
});

it('undo reinserts what was deleted later while external change on other side', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.insert('b');
  A.insert('c');

  A.setCaret(1);
  A.delete();
  A.submitChangesInstant();
  expect(A.getViewTextWithSelection()).toStrictEqual('│bc');

  B.setCaret(-1);
  B.insert('B');
  B.submitChangesInstant();

  expect(A.viewText).toStrictEqual('bcB');

  A.undo();
  expect(A.viewText).toStrictEqual('abcB');

  A.undo();
  expect(A.viewText).toStrictEqual('abB');

  A.undo();
  expect(A.viewText).toStrictEqual('aB');

  A.undo();
  expect(A.viewText).toStrictEqual('B');

  A.redo();
  expect(A.viewText).toStrictEqual('aB');

  A.redo();
  expect(A.viewText).toStrictEqual('abB');

  A.redo();
  expect(A.viewText).toStrictEqual('abcB');

  A.redo();
  expect(A.viewText).toStrictEqual('bcB');
});

it('external deletion undo and redo reinserts', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.insert('b');
  A.submitChangesInstant();

  expect(A.getViewTextWithSelection()).toStrictEqual('ab│');

  B.setCaret(-1);
  B.delete();
  B.submitChangesInstant();
  expect(A.getViewTextWithSelection()).toStrictEqual('a│');

  A.undo();
  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('│');

  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('a│');

  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('ab│');
});

it('redo after receiving external change', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  A.insert('a');
  A.insert('b');
  A.submitChangesInstant();

  expect(A.getViewTextWithSelection()).toStrictEqual('ab│');

  A.undo();
  expect(A.getViewTextWithSelection()).toStrictEqual('a│');

  B.insert('A');
  B.submitChangesInstant();
  B.insert('B');
  B.submitChangesInstant();
  expect(A.getViewTextWithSelection()).toStrictEqual('ABa│');

  A.redo();
  expect(A.getViewTextWithSelection()).toStrictEqual('ABab│');
});

it('undo between external changes then redo', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  B.insert('A[]B[]');
  B.submitChangesInstant();

  A.setCaret(5);
  // E0
  A.insert('a');
  // E1
  A.insert('b');
  A.submitChangesInstant();

  B.setCaret(2);
  // B1
  B.insert('A');
  B.submitChangesInstant();

  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[A]B[ab│]"`);

  // f(U2, B1)
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[A]B[a│]"`);

  // B2
  B.insert('B');
  B.submitChangesInstant();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[AB]B[a│]"`);

  // U1
  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[AB]B[│]"`);

  // R1
  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[AB]B[a│]"`);
  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[AB]B[ab│]"`);
});

it('on redo reapplies change deleted by external user ', () => {
  const {
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
  });

  B.insert('A[]B[]');
  B.submitChangesInstant();

  A.setCaret(5);
  A.insert('a');
  A.insert('b');
  A.insert('c');
  A.submitChangesInstant();

  B.setCaret(2);
  B.insert('A');
  B.submitChangesInstant();

  B.setCaret(8);
  B.delete();
  B.submitChangesInstant();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[A]B[ac│]"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[A]B[a│]"`);

  A.undo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[A]B[│]"`);

  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[A]B[a│]"`);

  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[A]B[ab│]"`);

  A.redo();
  expect(A.getViewTextWithSelection()).toMatchInlineSnapshot(`"A[A]B[abc│]"`);
});

it('can undo "d" after setting new headText', () => {
  const {
    server,
    client: { A, B },
  } = createCollabSandbox({
    clients: ['A', 'B'],
    client: {
      service: {
        context: {
          // Both clients are treated as same user
          isExternalTypingHistory: () => true,
        },
      },
    },
  });

  A.insert('a');
  A.submitChangesInstant();
  A.insert('b');
  A.submitChangesInstant();
  B.disconnect();

  A.insert('c');
  A.submitChangesInstant();
  A.insert('d');
  A.submitChangesInstant();
  expect(B.getViewTextWithSelection()).toMatchInlineSnapshot(`"│ab"`);

  B.reconnect();
  expect(B.getViewTextWithSelection()).toMatchInlineSnapshot(`"│ab"`);

  B.reset(server.headRecord);
  expect(B.getViewTextWithSelection()).toMatchInlineSnapshot(`"│abcd"`);

  B.undo();
  expect(B.getViewTextWithSelection()).toMatchInlineSnapshot(`"abc│"`);
});
