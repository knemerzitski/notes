 
 
 
import { it, expect } from 'vitest';

import { Changeset } from '../common/changeset';

import { Selection } from '../common/selection';

import { composeNewTail } from './compose-new-tail';
import { ServerRecord, TailRecord } from './types';

const cs = Changeset.parse;
const s = Selection.parse;

const tailRecord: TailRecord = {
  revision: 5,
  text: cs('0:"b"'),
};

const records: ServerRecord[] = [
  {
    revision: 6,
    authorId: '1',
    idempotencyId: '2',
    changeset: cs('1:0,"c"'),
    inverse: cs('2:0'),
    selectionInverse: s('1'),
    selection: s('2'),
  },
  {
    revision: 7,
    authorId: '1',
    idempotencyId: '3',
    changeset: cs('2:"a",0-1'),
    inverse: cs('3:0-1'),
    selectionInverse: s('2'),
    selection: s('3'),
  },
];

it('count 0 returns same tailRecord', () => {
  const newTailRecord = composeNewTail(tailRecord, records, 0);
  expect(newTailRecord).toStrictEqual(tailRecord);
});

it('count 1 composes one record', () => {
  const newTailRecord = composeNewTail(tailRecord, records, 1);
  expect(newTailRecord).toStrictEqual({
    revision: 6,
    text: cs('0:"bc"'),
  });
});

it('count 2 composes two records', () => {
  const newTailRecord = composeNewTail(tailRecord, records, 2);
  expect(newTailRecord).toStrictEqual({
    revision: 7,
    text: cs('0:"abc"'),
  });
});

it('count 3 composes all available records', () => {
  const newTailRecord = composeNewTail(tailRecord, records, 3);
  expect(newTailRecord).toStrictEqual({
    revision: 7,
    text: cs('0:"abc"'),
  });
});
