import mitt from '~utils/mitt-unsub';
import { beforeEach, expect, it, vi } from 'vitest';

import { OrderedMessageBuffer } from './ordered-message-buffer';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Messages = {
  foo: string;
};

const fooHandler = vi.fn<[Messages['foo']], void>();
const bus = mitt<Messages>();
bus.on('foo', fooHandler);

let buffer: OrderedMessageBuffer<Messages>;

beforeEach(() => {
  fooHandler.mockClear();
  // Initial: version 10, messages: ['_12', '_13'],
  buffer = new OrderedMessageBuffer({ initialVersion: 10, messageBus: bus });
  buffer.add('foo', 12, '_12');
  buffer.add('foo', 13, '_13');
});

it('ignores old or same version messages', () => {
  expect(buffer.add('foo', 10, 'discard same')).toBeFalsy();
  expect(buffer.add('foo', 9, 'discard same')).toBeFalsy();
  expect(buffer.currentVersion).toStrictEqual(10);
  expect(fooHandler).not.toHaveBeenCalled();
  expect(buffer.size).toStrictEqual(2);

  expect(buffer.add('foo', 11, 'start 11')).toBeTruthy();
  expect(fooHandler.mock.calls).toStrictEqual([['start 11'], ['_12'], ['_13']]);
  expect(buffer.currentVersion).toStrictEqual(13);
  expect(buffer.size).toStrictEqual(0);
});

it('stashes future messages', () => {
  expect(buffer.add('foo', 14, '_14')).toBeTruthy();
  expect(buffer.add('foo', 15, '_15')).toBeTruthy();
  expect(fooHandler).not.toHaveBeenCalled();
  expect(buffer.size).toStrictEqual(4);
  expect(buffer.add('foo', 11, '_11')).toBeTruthy();

  expect(fooHandler.mock.calls).toStrictEqual([
    ['_11'],
    ['_12'],
    ['_13'],
    ['_14'],
    ['_15'],
  ]);
  expect(buffer.currentVersion).toStrictEqual(15);
  expect(buffer.size).toStrictEqual(0);
});

it('ignores duplicate future messages', () => {
  expect(buffer.add('foo', 12, '_12 duplicate')).toBeFalsy();
  expect(buffer.add('foo', 13, '_13 duplicate')).toBeFalsy();
  expect(buffer.add('foo', 12, '_12 duplicate 2')).toBeFalsy();
  expect(buffer.add('foo', 13, '_13 duplicate 2')).toBeFalsy();
  expect(fooHandler).not.toHaveBeenCalled();
  expect(buffer.add('foo', 11, '_11')).toBeTruthy();
  expect(fooHandler.mock.calls).toStrictEqual([['_11'], ['_12'], ['_13']]);
  expect(buffer.currentVersion).toStrictEqual(13);
});

it('supports different messages types', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  type MultipleMessages = {
    foo: string;
    bar: string;
  };

  const fooHandler = vi.fn<[MultipleMessages['foo']], void>();
  const barHandler = vi.fn<[MultipleMessages['bar']], void>();
  const bus = mitt<MultipleMessages>();
  bus.on('foo', fooHandler);
  bus.on('bar', barHandler);

  const buffer = new OrderedMessageBuffer({ initialVersion: 0, messageBus: bus });

  buffer.add('foo', 1, 'fooMsg');
  buffer.add('bar', 2, 'barMsg');

  expect(fooHandler).toHaveBeenCalledWith('fooMsg');
  expect(barHandler).toHaveBeenCalledWith('barMsg');
  expect(buffer.currentVersion).toStrictEqual(2);
});
