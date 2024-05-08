import { beforeEach, describe, expect, it } from 'vitest';

import { RevisionTailRecords } from '../records/revision-tail-records';
import { ServerRevisionRecord } from '../records/record';
import { createHelperCollabEditingEnvironment } from './helpers/server-client';
import { addEditorFilters } from '../records/editor-revision-records';
import { Changeset } from '../changeset/changeset';

const cs = (...values: unknown[]) => Changeset.parseValue(values);

describe('single client', () => {
  let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A'>>;

  beforeEach(() => {
    const revisionTailRecords = new RevisionTailRecords<ServerRevisionRecord>();
    addEditorFilters(revisionTailRecords);
    helper = createHelperCollabEditingEnvironment(revisionTailRecords, ['A']);
  });

  it('processes "hello world"', () => {
    const { server, client } = helper;

    expect(client.A.valueWithSelection()).toStrictEqual('>');
    expect(server.headText()).toStrictEqual('');

    client.A.insertText('hello world');
    expect(client.A.valueWithSelection()).toStrictEqual('hello world>');
    expect(server.headText()).toStrictEqual('');

    client.A.submitChangesInstant();

    expect(client.A.valueWithSelection()).toStrictEqual('hello world>');
    expect(server.headText()).toStrictEqual('hello world');
  });

  it('external changes to server are composed as retained characters in submitted and local', () => {
    const { client } = helper;

    client.A.insertText('server');
    client.A.client.submitChanges();
    client.A.client.submittedChangesAcknowledged();
    client.A.insertText('; submitted');
    client.A.client.submitChanges();
    client.A.insertText('; local');
    client.A.insertText('; more');
    client.A.client.handleExternalChange(
      cs('external before - ', [0, 5], ' - external after')
    );

    expect(client.A.client.server.toString()).toStrictEqual(
      cs('external before - server - external after').toString()
    );
    expect(client.A.client.submitted.toString()).toStrictEqual(
      cs([0, 23], '; submitted', [24, 40]).toString()
    );
    expect(client.A.client.local.toString()).toStrictEqual(
      cs([0, 34], '; local; more', [35, 51]).toString()
    );
    expect(client.A.client.view.toString()).toStrictEqual(
      cs('external before - server; submitted; local; more - external after').toString()
    );
    expect(client.A.valueWithSelection()).toStrictEqual(
      'external before - server; submitted; local; more> - external after'
    );
  });

  it('edits e0 to e8 with duplicate external deletion', () => {
    const { client } = helper;

    client.A.insertText('[e0]');
    client.A.insertText('[e1]');
    client.A.insertText('[e2]');
    client.A.client.submitChanges();
    client.A.client.submittedChangesAcknowledged();
    client.A.insertText('[e3]');
    client.A.insertText('[e4]');
    client.A.insertText('[e5]');
    client.A.client.submitChanges();
    client.A.insertText('[e6]');
    client.A.insertText('[e7]');
    client.A.insertText('[e8]');
    client.A.setCaretPosition(4);
    client.A.deleteTextCount(4);

    client.A.client.handleExternalChange(
      cs('[EXTERNAL]', [4, 7], '[BETWEEN]', [8, 11], '[EXTERNAL]')
    );

    client.A.client.submittedChangesAcknowledged();
    client.A.client.submitChanges();
    client.A.client.submittedChangesAcknowledged();

    client.A.client.handleExternalChange(cs([0, 30], '[somewhere]', [31, 60]));

    client.A.setCaretPosition(23);
    client.A.deleteTextCount(9);

    expect(client.A.valueWithSelection()).toStrictEqual(
      '[EXTERNAL][e1]>[e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]'
    );

    expect(client.A.client.local.toString()).toStrictEqual('(72 -> 63)[0 - 13, 23 - 71]');
    expect(client.A.client.submitted.toString()).toStrictEqual('(72 -> 72)[0 - 71]');
    expect(client.A.client.server.toString()).toStrictEqual(
      '(0 -> 72)["[EXTERNAL][e1][BETWEEN][e2][e3][somewhere][e4][e5][e6][e7][e8][EXTERNAL]"]'
    );
  });

  it('merges history entries with option set', () => {
    const { client } = helper;

    client.A.insertText('hello world');
    client.A.insertText(' one', { merge: true });
    expect(client.A.valueWithSelection()).toStrictEqual('hello world one>');
    expect(client.A.editor.history.entries).toHaveLength(1);
    client.A.editor.undo();
    expect(client.A.valueWithSelection()).toStrictEqual('>');
  });
});

describe('two clients', () => {
  let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A' | 'B'>>;

  beforeEach(() => {
    const revisionTailRecords = new RevisionTailRecords<ServerRevisionRecord>();
    addEditorFilters(revisionTailRecords);
    helper = createHelperCollabEditingEnvironment(revisionTailRecords, ['A', 'B']);
  });

  it('converges 2 changes at the same time', () => {
    const { server, client } = helper;

    client.A.insertText('both typing');
    client.B.insertText('at the same time ');
    const sendingA = client.A.submitChanges();
    const sendingB = client.B.submitChanges();
    expect(server.headText()).toStrictEqual('');

    const receivedB = sendingB.serverReceive();
    const receivedA = sendingA.serverReceive();
    receivedA.clientAcknowledge();
    receivedB.sendToOtherClients();
    receivedB.clientAcknowledge();
    receivedA.sendToOtherClients();

    helper.expectTextsConverted('at the same time [1>]both typing[0>]');
  });

  it('converges changes from a client with a higher latency', () => {
    const { client } = helper;

    client.B.insertText('\n\n\n');
    client.B.submitChangesInstant();

    client.A.setCaretPosition(0);
    client.A.insertText('At start');
    const receivedA_1 = client.A.submitChanges().serverReceive();
    receivedA_1.clientAcknowledge();

    expect(client.A.valueWithSelection()).toStrictEqual('At start>\n\n\n');
    expect(client.B.valueWithSelection()).toStrictEqual('\n\n\n>');

    client.A.insertText(' typing first');
    const receivedA_2 = client.A.submitChanges().serverReceive();
    client.B.insertText('Somewhere in the');
    receivedA_2.clientAcknowledge();

    expect(client.A.valueWithSelection()).toStrictEqual('At start typing first>\n\n\n');
    expect(client.B.valueWithSelection()).toStrictEqual('\n\n\nSomewhere in the>');

    client.A.insertText(' sentence.');
    const receivedA_3 = client.A.submitChanges().serverReceive();
    client.B.insertText(' middle editing');
    receivedA_3.clientAcknowledge();

    expect(client.A.valueWithSelection()).toStrictEqual(
      'At start typing first sentence.>\n\n\n'
    );
    expect(client.B.valueWithSelection()).toStrictEqual(
      '\n\n\nSomewhere in the middle editing>'
    );

    client.A.insertText(' Woo!');
    const receivedA_4 = client.A.submitChanges().serverReceive();
    client.B.insertText(' together.');
    receivedA_4.acknowledgeAndSendToOtherClients();
    receivedA_1.sendToOtherClients();
    receivedA_3.sendToOtherClients();
    receivedA_2.sendToOtherClients();
    client.B.submitChangesInstant();

    helper.expectTextsConverted(
      'At start typing first sentence. Woo![0>]\n\n\nSomewhere in the middle editing together.[1>]'
    );
  });

  it(`handles client B messing with client A's text while they're editing`, () => {
    const { client } = helper;

    client.A.insertText('Do not modify what im typing.');
    client.A.submitChangesInstant();

    client.A.insertText(' Second sentence.');
    client.B.setCaretFromValue('Do >not< modify what im typing.');
    client.B.insertText('always');
    let receivedA = client.A.submitChanges().serverReceive();
    let receivedB = client.B.submitChanges().serverReceive();
    receivedA.clientAcknowledge();
    receivedB.sendToOtherClients();
    receivedA.sendToOtherClients();
    receivedB.clientAcknowledge();

    helper.expectTextsConverted(
      'Do always[1>] modify what im typing. Second sentence.[0>]'
    );

    client.B.setCaretFromValue('>Do always modify what im typing.<');
    client.B.insertText('Rewrote first sentence.');
    client.A.setCaretPosition(0);
    client.A.insertText('IMPORTANT: ');
    receivedA = client.A.submitChanges().serverReceive();
    receivedB = client.B.submitChanges().serverReceive();
    receivedA.clientAcknowledge();
    receivedB.sendToOtherClients();
    receivedB.clientAcknowledge();
    receivedA.sendToOtherClients();

    helper.expectTextsConverted(
      'IMPORTANT: [0>]Rewrote first sentence.[1>] Second sentence.'
    );
  });
});

describe('three clients', () => {
  let helper: ReturnType<typeof createHelperCollabEditingEnvironment<'A' | 'B' | 'C'>>;

  beforeEach(() => {
    const revisionTailRecords = new RevisionTailRecords<ServerRevisionRecord>();
    addEditorFilters(revisionTailRecords);
    helper = createHelperCollabEditingEnvironment(revisionTailRecords, ['A', 'B', 'C']);
  });

  it(`converges 3 changes at the same time'`, () => {
    const { client } = helper;

    client.A.insertText('initial document. A:, B:, C:');
    client.A.submitChangesInstant();

    client.B.setCaretFromValue('initial document. A:, B:>, C:');
    client.B.insertText('b text');
    let receivedB = client.B.submitChanges().serverReceive();
    client.A.setCaretFromValue('initial document. A:>, B:, C:');
    client.A.insertText('a text');
    let receivedA = client.A.submitChanges().serverReceive();
    client.C.setCaretFromValue('initial document. A:, B:, C:>');
    client.C.insertText('c text');
    let receivedC = client.C.submitChanges().serverReceive();
    receivedC.acknowledgeAndSendToOtherClients();
    receivedA.acknowledgeAndSendToOtherClients();
    receivedB.acknowledgeAndSendToOtherClients();

    helper.expectTextsConverted(
      'initial document. A:a text[0>], B:b text[1>], C:c text[2>]'
    );

    client.C.setCaretFromValue('initial document>. A:a text, B:b text, C:c text');
    client.C.insertText(' extra');
    receivedC = client.C.submitChanges().serverReceive();
    client.A.deleteTextCount(4);
    client.A.insertText('number');
    receivedA = client.A.submitChanges().serverReceive();
    client.B.setCaretPosition(2);
    client.B.deleteTextCount(2);
    client.B.insertText('without "in" here:');
    receivedB = client.B.submitChanges().serverReceive();
    receivedB.acknowledgeAndSendToOtherClients();
    receivedC.acknowledgeAndSendToOtherClients();
    receivedA.acknowledgeAndSendToOtherClients();

    helper.expectTextsConverted(
      'without "in" here:[1>]itial document extra[2>]. A:a number[0>], B:b text, C:c text'
    );
  });
});
