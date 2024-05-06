import { beforeEach, expect, it } from 'vitest';
import { OrderedMessageBuffer } from './ordered-message-buffer';

interface Message {
  version: number;
  payload: string;
}

let buffer: OrderedMessageBuffer<Message>;

beforeEach(() => {
  // Initial: version 10, messages: [12, 13],
  buffer = new OrderedMessageBuffer({
    version: 10,
    getVersion: (m) => m.version,
    messages: [
      {
        version: 13,
        payload: '_13',
      },
      {
        version: 12,
        payload: '_12',
      },
    ],
  });
});

it('ignores old or same versions', () => {
  expect(
    buffer.add({
      version: 10,
      payload: 'discard same',
    })
  ).toBeFalsy();
  expect(
    buffer.add({
      version: 9,
      payload: 'discard same',
    })
  ).toBeFalsy();
  expect(buffer.currentVersion).toStrictEqual(10);
  expect([...buffer.popIterable()]).toHaveLength(0);
  expect(buffer.size).toStrictEqual(2);

  expect(
    buffer.add({
      version: 11,
      payload: 'start 11',
    })
  ).toBeTruthy();
  expect([...buffer.popIterable()].map((m) => m.payload)).toStrictEqual([
    'start 11',
    '_12',
    '_13',
  ]);
  expect(buffer.currentVersion).toStrictEqual(13);
  expect(buffer.size).toStrictEqual(0);
});

it('stashes future messages', () => {
  expect(
    buffer.add({
      version: 14,
      payload: '_14',
    })
  ).toBeTruthy();
  expect(
    buffer.add({
      version: 15,
      payload: '_15',
    })
  ).toBeTruthy();
  expect([...buffer.popIterable()]).toHaveLength(0);
  expect(buffer.size).toStrictEqual(4);
  expect(
    buffer.add({
      version: 11,
      payload: '_11',
    })
  ).toBeTruthy();

  expect([...buffer.popIterable()].map((m) => m.payload)).toStrictEqual([
    '_11',
    '_12',
    '_13',
    '_14',
    '_15',
  ]);
  expect(buffer.currentVersion).toStrictEqual(15);
  expect(buffer.size).toStrictEqual(0);
});

it('ignores duplicate future messages', () => {
  expect(
    buffer.add({
      version: 12,
      payload: '_12 duplicate',
    })
  ).toBeFalsy();
  expect(
    buffer.add({
      version: 13,
      payload: '_13 duplicate',
    })
  ).toBeFalsy();
  expect(
    buffer.add({
      version: 12,
      payload: '_12 duplicate 2',
    })
  ).toBeFalsy();
  expect(
    buffer.add({
      version: 13,
      payload: '_13 duplicate 2',
    })
  ).toBeFalsy();
  expect([...buffer.popIterable()]).toHaveLength(0);
  expect(
    buffer.add({
      version: 11,
      payload: '_11',
    })
  ).toBeTruthy();
  expect([...buffer.popIterable()].map((m) => m.payload)).toStrictEqual([
    '_11',
    '_12',
    '_13',
  ]);
  expect(buffer.currentVersion).toStrictEqual(13);
});