import { describe, expect, it } from 'vitest';

import { DocumentClient } from './helpers/document-client';
import { DocumentServer } from './helpers/document-server';
import { Scheduler } from './helpers/scheduler';

/**
 * Eg. {@link text} = both typing<0> at the same time<1>
 * returns
 *  'both typing> at the same time',
 *  'both typing at the same time>',
 * ]
 * Returned array value is indexed by <#> where # is index
 */
function parseCursorText(textWithCursors: string) {
  const cursorIndexes: [number, number][] = [];
  let text = '';

  for (let i = 0, pos = 0; i < textWithCursors.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const c = textWithCursors[i]!;
    if (c === '<') {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const idx = Number.parseInt(textWithCursors[++i]!);
      const val = cursorIndexes[idx];
      if (!val) {
        cursorIndexes[idx] = [pos, pos];
      } else {
        val[1] = pos;
      }
      i++;
    } else {
      text += c;
      pos++;
    }
  }

  return {
    text,
    cursorTexts: cursorIndexes.map(([pos1, pos2]) =>
      pos1 === pos2
        ? text.substring(0, pos1) + '>' + text.substring(pos1)
        : text.substring(0, pos1) +
          '>' +
          text.substring(pos1, pos2) +
          '<' +
          text.substring(pos2)
    ),
  };
}

function expectDocumentsConverged(
  textWithCursors: string,
  server: DocumentServer,
  ...clients: DocumentClient[]
) {
  const { text, cursorTexts } = parseCursorText(textWithCursors);
  expect(server.getHeadText()).toStrictEqual(text);
  clients.forEach((client, index) => {
    expect(client.getValueWithCursors()).toStrictEqual(cursorTexts[index]);
  });
}

describe('document-server-client', () => {
  it('handles sending "hello world"', () => {
    const scheduler = new Scheduler(true);
    const server = new DocumentServer();
    const client = new DocumentClient(server.newSocket(scheduler));

    client.connect();
    expect(client.getValueWithCursors()).toStrictEqual('>');
    expect(server.getHeadText()).toStrictEqual('');

    client.type('hello world');
    expect(client.getValueWithCursors()).toStrictEqual('hello world>');
    expect(server.getHeadText()).toStrictEqual('');

    client.sendChanges();
    expect(client.getValueWithCursors()).toStrictEqual('hello world>');
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
    a.type('both typing');
    b.type(' at the same time');
    a.sendChanges();
    b.sendChanges();
    expect(server.getHeadText()).toStrictEqual('');

    scheduler.run(100);
    expectDocumentsConverged('both typing<0> at the same time<1>', server, a, b);
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

    a.type('initial document. A:, B:, C:');
    a.sendChanges();
    scheduler.run();

    b.setCursorByValue('initial document. A:, B:>, C:');
    b.type('b text');
    b.sendChanges();
    a.setCursorByValue('initial document. A:>, B:, C:');
    a.type('a text');
    a.sendChanges();
    c.setCursorByValue('initial document. A:, B:, C:>');
    c.type('c text');
    c.sendChanges();
    scheduler.run();

    expectDocumentsConverged(
      'initial document. A:a text<0>, B:b text<1>, C:c text<2>',
      server,
      a,
      b,
      c
    );

    c.setCursorByValue('initial document>. A:a text, B:b text, C:c text');
    c.type(' extra');
    c.sendChanges();
    a.backspace(4);
    a.type('number');
    a.sendChanges();
    b.setCursor(2);
    b.backspace(2);
    b.type('without "in" here:');
    b.sendChanges();
    scheduler.run();

    expectDocumentsConverged(
      'without "in" here:<1>itial document extra<2>. A:a number<0>, B:b text, C:c text',
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

    b.type('\n\n\n');
    b.sendChanges();
    scheduler.run(100);

    a.setCursor(0);
    a.type('At start');
    a.sendChanges();
    b.setRoundTripLatency(500);
    scheduler.run(100);

    a.type(' typing first');
    a.sendChanges();
    b.type('Somewhere in the');
    scheduler.run(100);

    a.type(' sentence.');
    a.sendChanges();
    b.type(' middle editing');
    scheduler.run(100);

    a.type(' Woo!');
    a.sendChanges();
    b.type(' together.');
    scheduler.run(300);
    b.sendChanges();

    scheduler.run();
    expectDocumentsConverged(
      `At start typing first sentence. Woo!<0>\n\n\nSomewhere in the middle editing together.<1>`,
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
    a.type('Do not modify what im typing.');
    a.sendChanges();
    scheduler.run(100);

    a.type(' Second sentence.');
    b.setCursorByValue('Do >not< modify what im typing.');
    b.type('always');
    b.sendChanges();
    a.sendChanges();
    scheduler.run(100);

    expectDocumentsConverged(
      'Do always<1> modify what im typing. Second sentence.<0>',
      server,
      a,
      b
    );

    b.setCursorByValue('>Do always modify what im typing.<');
    b.type('Rewrote first sentence.');
    a.setCursor(0);
    a.type('IMPORTANT: ');
    a.sendChanges();
    b.sendChanges();
    scheduler.run(100);

    expectDocumentsConverged(
      'IMPORTANT: <0>Rewrote first sentence.<1> Second sentence.',
      server,
      a,
      b
    );
  });
});
