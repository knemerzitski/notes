import { beforeEach, describe, expect, it } from 'vitest';

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

  it('processes "hello world"', () => {
    const { server, client } = helper;

    expect(client.A.valueWithSelection()).toStrictEqual('>');
    expect(server.headText()).toStrictEqual('');

    client.A.instance.insertText('hello world');
    expect(client.A.valueWithSelection()).toStrictEqual('hello world>');
    expect(server.headText()).toStrictEqual('');

    client.A.submitChangesInstant();

    expect(client.A.valueWithSelection()).toStrictEqual('hello world>');
    expect(server.headText()).toStrictEqual('hello world');
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

  it('converges 2 changes at the same time', () => {
    const { server, client } = helper;

    client.A.instance.insertText('both typing');
    client.B.instance.insertText('at the same time ');
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

    client.B.instance.insertText('\n\n\n');
    client.B.submitChangesInstant();

    client.A.instance.setCaretPosition(0);
    client.A.instance.insertText('At start');
    const receivedA_1 = client.A.submitChanges().serverReceive();
    receivedA_1.clientAcknowledge();

    expect(client.A.valueWithSelection()).toStrictEqual('At start>\n\n\n');
    expect(client.B.valueWithSelection()).toStrictEqual('\n\n\n>');

    client.A.instance.insertText(' typing first');
    const receivedA_2 = client.A.submitChanges().serverReceive();
    client.B.instance.insertText('Somewhere in the');
    receivedA_2.clientAcknowledge();

    expect(client.A.valueWithSelection()).toStrictEqual('At start typing first>\n\n\n');
    expect(client.B.valueWithSelection()).toStrictEqual('\n\n\nSomewhere in the>');

    client.A.instance.insertText(' sentence.');
    const receivedA_3 = client.A.submitChanges().serverReceive();
    client.B.instance.insertText(' middle editing');
    receivedA_3.clientAcknowledge();

    expect(client.A.valueWithSelection()).toStrictEqual(
      'At start typing first sentence.>\n\n\n'
    );
    expect(client.B.valueWithSelection()).toStrictEqual(
      '\n\n\nSomewhere in the middle editing>'
    );

    client.A.instance.insertText(' Woo!');
    const receivedA_4 = client.A.submitChanges().serverReceive();
    client.B.instance.insertText(' together.');
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

    client.A.instance.insertText('Do not modify what im typing.');
    client.A.submitChangesInstant();

    client.A.instance.insertText(' Second sentence.');
    client.B.setCaretFromValue('Do >not< modify what im typing.');
    client.B.instance.insertText('always');
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
    client.B.instance.insertText('Rewrote first sentence.');
    client.A.instance.setCaretPosition(0);
    client.A.instance.insertText('IMPORTANT: ');
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
  let helper: ReturnType<typeof createServerClientsHelper<'A' | 'B' | 'C'>>;

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
      C: new CollabEditor({
        userId: 'C',
      }),
    });
  });

  it(`converges 3 changes at the same time'`, () => {
    const { client } = helper;

    client.A.instance.insertText('initial document. A:, B:, C:');
    client.A.submitChangesInstant();

    client.B.setCaretFromValue('initial document. A:, B:>, C:');
    client.B.instance.insertText('b text');
    let receivedB = client.B.submitChanges().serverReceive();
    client.A.setCaretFromValue('initial document. A:>, B:, C:');
    client.A.instance.insertText('a text');
    let receivedA = client.A.submitChanges().serverReceive();
    client.C.setCaretFromValue('initial document. A:, B:, C:>');
    client.C.instance.insertText('c text');
    let receivedC = client.C.submitChanges().serverReceive();
    receivedC.acknowledgeAndSendToOtherClients();
    receivedA.acknowledgeAndSendToOtherClients();
    receivedB.acknowledgeAndSendToOtherClients();

    helper.expectTextsConverted(
      'initial document. A:a text[0>], B:b text[1>], C:c text[2>]'
    );

    client.C.setCaretFromValue('initial document>. A:a text, B:b text, C:c text');
    client.C.instance.insertText(' extra');
    receivedC = client.C.submitChanges().serverReceive();
    client.A.instance.deleteTextCount(4);
    client.A.instance.insertText('number');
    receivedA = client.A.submitChanges().serverReceive();
    client.B.instance.setCaretPosition(2);
    client.B.instance.deleteTextCount(2);
    client.B.instance.insertText('without "in" here:');
    receivedB = client.B.submitChanges().serverReceive();
    receivedB.acknowledgeAndSendToOtherClients();
    receivedC.acknowledgeAndSendToOtherClients();
    receivedA.acknowledgeAndSendToOtherClients();

    helper.expectTextsConverted(
      'without "in" here:[1>]itial document extra[2>]. A:a number[0>], B:b text, C:c text'
    );
  });
});
