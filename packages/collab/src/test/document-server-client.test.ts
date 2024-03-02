// import { inspect } from 'util';

import { describe, expect, it } from 'vitest';

import { SelectionDirection } from '../editor/selection-range';

import { DocumentClient } from './helpers/document-client';
import { DocumentServer } from './helpers/document-server';
import { Scheduler } from './helpers/scheduler';
import { parseTextWithMultipleSelections } from './helpers/text-with-selection';

function expectDocumentsConverged(
  textWithCursors: string,
  server: DocumentServer,
  ...clients: DocumentClient[]
) {
  const { rawText, textWithSelection } = parseTextWithMultipleSelections(textWithCursors);
  expect(server.getHeadText()).toStrictEqual(rawText);
  clients.forEach((client, index) => {
    expect(client.getValueWithSelection()).toStrictEqual(textWithSelection[index]);
  });
}

describe('document-server-client', () => {
  it('handles sending "hello world"', () => {
    const scheduler = new Scheduler(true);
    const server = new DocumentServer();
    const client = new DocumentClient(server.newSocket(scheduler));

    client.connect();
    expect(client.getValueWithSelection()).toStrictEqual('>');
    expect(server.getHeadText()).toStrictEqual('');

    client.insertText('hello world');
    expect(client.getValueWithSelection()).toStrictEqual('hello world>');
    expect(server.getHeadText()).toStrictEqual('');

    client.sendChanges();
    expect(client.getValueWithSelection()).toStrictEqual('hello world>');
    expect(server.getHeadText()).toStrictEqual('hello world');
  });

  it('converges 2 changes at the same time', () => {
    const scheduler = new Scheduler();
    const server = new DocumentServer();
    const a = new DocumentClient(server.newSocket(scheduler));
    const b = new DocumentClient(server.newSocket(scheduler));

    scheduler.autoRun = true;
    a.connect();
    b.connect();
    a.setRoundTripLatency(100);
    b.setRoundTripLatency(100);

    scheduler.autoRun = false;
    a.insertText('both typing');
    b.insertText('at the same time ');
    a.sendChanges();
    b.sendChanges();
    expect(server.getHeadText()).toStrictEqual('');

    scheduler.run(100);
    expectDocumentsConverged('at the same time [1>]both typing[0>]', server, a, b);
  });

  it(`converges 3 changes at the same time'`, () => {
    const scheduler = new Scheduler();
    const server = new DocumentServer();
    const a = new DocumentClient(server.newSocket(scheduler));
    const b = new DocumentClient(server.newSocket(scheduler));
    const c = new DocumentClient(server.newSocket(scheduler));

    a.connect();
    b.connect();
    c.connect();
    scheduler.run();

    a.insertText('initial document. A:, B:, C:');
    a.sendChanges();
    scheduler.run();

    b.setCaretByValue('initial document. A:, B:>, C:');
    b.insertText('b text');
    b.sendChanges();
    a.setCaretByValue('initial document. A:>, B:, C:');
    a.insertText('a text');
    a.sendChanges();
    c.setCaretByValue('initial document. A:, B:, C:>');
    c.insertText('c text');
    c.sendChanges();
    scheduler.run();

    expectDocumentsConverged(
      'initial document. A:a text[0>], B:b text[1>], C:c text[2>]',
      server,
      a,
      b,
      c
    );

    c.setCaretByValue('initial document>. A:a text, B:b text, C:c text');
    c.insertText(' extra');
    c.sendChanges();
    a.deleteTextCount(4);
    a.insertText('number');
    a.sendChanges();
    b.setCaretPosition(2);
    b.deleteTextCount(2);
    b.insertText('without "in" here:');
    b.sendChanges();
    scheduler.run();

    expectDocumentsConverged(
      'without "in" here:[1>]itial document extra[2>]. A:a number[0>], B:b text, C:c text',
      server,
      a,
      b,
      c
    );
  });

  it('converges concurrent insertion, one client with higher latency', () => {
    const scheduler = new Scheduler();
    const server = new DocumentServer();
    const a = new DocumentClient(server.newSocket(scheduler));
    const b = new DocumentClient(server.newSocket(scheduler));

    scheduler.autoRun = true;
    a.connect();
    b.connect();
    a.setRoundTripLatency(100);
    b.setRoundTripLatency(100);
    scheduler.autoRun = false;

    b.insertText('\n\n\n');
    b.sendChanges();
    scheduler.run(100);

    a.setCaretPosition(0);
    a.insertText('At start');
    a.sendChanges();
    b.setRoundTripLatency(500);
    scheduler.run(100);

    a.insertText(' typing first');
    a.sendChanges();
    b.insertText('Somewhere in the');
    scheduler.run(100);

    a.insertText(' sentence.');
    a.sendChanges();
    b.insertText(' middle editing');
    scheduler.run(100);

    a.insertText(' Woo!');
    a.sendChanges();
    b.insertText(' together.');
    scheduler.run(300);
    b.sendChanges();

    scheduler.run();
    expectDocumentsConverged(
      `At start typing first sentence. Woo![0>]\n\n\nSomewhere in the middle editing together.[1>]`,
      server,
      a,
      b
    );
  });

  it(`handles client B messing with client A's text while they're editing`, () => {
    const scheduler = new Scheduler();
    const server = new DocumentServer();
    const a = new DocumentClient(server.newSocket(scheduler));
    const b = new DocumentClient(server.newSocket(scheduler));

    scheduler.autoRun = true;
    a.connect();
    b.connect();
    a.setRoundTripLatency(100);
    b.setRoundTripLatency(100);

    scheduler.autoRun = false;
    a.insertText('Do not modify what im typing.');
    a.sendChanges();
    scheduler.run(100);

    a.insertText(' Second sentence.');
    b.setCaretByValue('Do >not< modify what im typing.');
    b.insertText('always');
    b.sendChanges();
    a.sendChanges();
    scheduler.run(100);

    expectDocumentsConverged(
      'Do always[1>] modify what im typing. Second sentence.[0>]',
      server,
      a,
      b
    );

    b.setCaretByValue('>Do always modify what im typing.<');
    b.insertText('Rewrote first sentence.');
    a.setCaretPosition(0);
    a.insertText('IMPORTANT: ');
    a.sendChanges();
    b.sendChanges();
    scheduler.run(100);

    expectDocumentsConverged(
      'IMPORTANT: [0>]Rewrote first sentence.[1>] Second sentence.',
      server,
      a,
      b
    );
  });

  it('handles undo, redo of local changes', () => {
    const scheduler = new Scheduler(true);
    const server = new DocumentServer();
    const a = new DocumentClient(server.newSocket(scheduler));
    const b = new DocumentClient(server.newSocket(scheduler));

    a.connect();
    b.connect();
    a.insertText('hello world');
    a.setCaretByValue('hello >world');
    a.insertText('between ');

    a.sendChanges();
    scheduler.run();

    expect(a.getValueWithSelection()).toStrictEqual('hello between >world');
    a.undo();
    expect(a.getValueWithSelection()).toStrictEqual('hello >world');
    a.setCaretPosition(0);
    a.redo();
    expect(a.getValueWithSelection()).toStrictEqual('hello between >world');

    b.setCaretPosition(0);
    b.insertText('ALL: ');
    b.sendChanges();
    scheduler.run();

    expectDocumentsConverged('ALL: [1>]hello between [0>]world', server, a, b);

    a.setCaretPosition(-1);
    a.undo();
    expect(a.getValueWithSelection()).toStrictEqual('ALL: hello >world');
    a.undo();
    expect(a.getValueWithSelection()).toStrictEqual('ALL: >');
    a.redo();
    expect(a.getValueWithSelection()).toStrictEqual('ALL: hello world>');
    a.redo();
    expect(a.getValueWithSelection()).toStrictEqual('ALL: hello between >world');
  });

  it('undo, redo retains both cursor positions', () => {
    const scheduler = new Scheduler(true);
    const server = new DocumentServer();
    const a = new DocumentClient(server.newSocket(scheduler));

    a.connect();
    a.insertText('hello world');
    a.setCaretByValue('hello >world');
    a.insertText('between ');
    a.setCaretByValue('hello >between< world');
    a.selectionDirection = SelectionDirection.Backward;
    a.deleteTextCount();
    a.selectionDirection = SelectionDirection.Forward;
    a.undo();
    a.redo();
  });
});
