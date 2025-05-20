/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { it, expect } from 'vitest';

import { mock } from 'vitest-mock-extended';

import { stripSymbols } from '../__tests__/helpers/strip-symbols';
import { Changeset } from '../common/changeset';

import { Selection } from '../common/selection';

import { processSubmittedRecord } from './process-submitted-record';
import { HeadRecord, ServerRecord } from './types';

const cs = Changeset.parse;
const s = Selection.parse;

const records: ServerRecord[] = [
  {
    revision: 5,
    changeset: cs('0:"b"'),
    inverse: cs('1:'),
    authorId: '1',
    idempotencyId: '1',
    selectionInverse: s('0'),
    selection: s('1'),
  },
  {
    revision: 6,
    changeset: cs('1:0,"c"'),
    inverse: cs('2:0'),
    authorId: '1',
    idempotencyId: '2',
    selectionInverse: s('1'),
    selection: s('2'),
  },
  {
    revision: 7,
    changeset: cs('2:"a",0-1'),
    inverse: cs('3:1-2'),
    authorId: '1',
    idempotencyId: '3',
    selectionInverse: s('2'),
    selection: s('3'),
  },
];

const headRecord: HeadRecord = {
  revision: records[records.length - 1]!.revision,
  text: records.map((r) => r.changeset).reduce(Changeset.compose),
};

it('processes submission on headRecord', () => {
  const insertion = processSubmittedRecord(
    {
      targetRevision: 7,
      id: '4',
      authorId: '1',
      changeset: cs('3:0-2,"d"'),
      selectionInverse: s('3'),
      selection: s('4'),
    },
    records,
    headRecord
  );
  expect(insertion).toStrictEqual({
    type: 'new',
    record: {
      revision: 8,
      authorId: '1',
      idempotencyId: '4',
      changeset: cs('3:0-2,"d"'),
      inverse: cs('4:0-2'),
      selectionInverse: s('3'),
      selection: s('4'),
    } satisfies ServerRecord,
    headRecord: {
      revision: 8,
      text: cs('0:"abcd"'),
    } satisfies HeadRecord,
  });
});

it('processes submission on tailRecord', () => {
  const insertion = processSubmittedRecord(
    {
      targetRevision: 4,
      id: '5',
      authorId: '1',
      changeset: cs('0:">"'),
      selectionInverse: s('0'),
      selection: s('1'),
    },
    records,
    headRecord
  );
  expect(stripSymbols(insertion)).toStrictEqual({
    type: 'new',
    record: {
      revision: 8,
      authorId: '1',
      idempotencyId: '5',
      changeset: cs('3:0-2,">"'),
      inverse: cs('4:0-2'),
      selectionInverse: s('3'),
      selection: s('4'),
    } satisfies ServerRecord,
    headRecord: {
      revision: 8,
      text: cs('0:"abc>"'),
    } satisfies HeadRecord,
  });
});

it('processes submission tailRecord 2', () => {
  const insertion = processSubmittedRecord(
    {
      targetRevision: 4,
      id: '5',
      authorId: '1',
      changeset: cs('0:"never"'),
      selectionInverse: s('0'),
      selection: s('5'),
    },
    records,
    headRecord
  );
  expect(stripSymbols(insertion)).toStrictEqual({
    type: 'new',
    record: {
      revision: 8,
      authorId: '1',
      idempotencyId: '5',
      changeset: cs('3:0-2,"never"'),
      inverse: cs('8:0-2'),
      selectionInverse: s('3'),
      selection: s('8'),
    } satisfies ServerRecord,
    headRecord: {
      revision: 8,
      text: cs('0:"abcnever"'),
    } satisfies HeadRecord,
  });
});

it('processes submission on oldest revision in records', () => {
  const insertion = processSubmittedRecord(
    {
      targetRevision: 5,
      authorId: '1',
      id: '5',
      changeset: cs('1:0,">"'),
      selectionInverse: s('1'),
      selection: s('2'),
    },
    records,
    headRecord
  );
  expect(stripSymbols(insertion)).toStrictEqual({
    type: 'new',
    record: {
      revision: 8,
      authorId: '1',
      idempotencyId: '5',
      changeset: cs('3:0-2,">"'),
      inverse: cs('4:0-2'),
      selectionInverse: s('3'),
      selection: s('4'),
    } satisfies ServerRecord,
    headRecord: {
      revision: 8,
      text: cs('0:"abc>"'),
    } satisfies HeadRecord,
  });
});

it('returns duplicate record and leaves headRecord unmodified', () => {
  const insertion = processSubmittedRecord(
    {
      targetRevision: 5,
      authorId: '1',
      id: '2',
      changeset: cs('1:0,"c"'),
      selectionInverse: s('1'),
      selection: s('2'),
    },
    records,
    headRecord
  );
  expect(stripSymbols(insertion)).toStrictEqual({
    type: 'duplicate',
    record: {
      revision: 6,
      authorId: '1',
      idempotencyId: '2',
      changeset: cs('1:0,"c"'),
      inverse: cs('2:0'),
      selectionInverse: s('1'),
      selection: s('2'),
    } satisfies ServerRecord,
  });
});

it('throws error if submitted record on tailRecord has invalid length', () => {
  expect(() =>
    processSubmittedRecord(
      {
        targetRevision: 4,
        changeset: cs('1001:2-500,"never",501-1000'),
        id: '5',
        authorId: '1',
        selectionInverse: s('501'),
        selection: s('506'),
      },
      records,
      headRecord
    )
  ).toThrow();
});

it('throws error if submitted record targets too old revision', () => {
  expect(() =>
    processSubmittedRecord(
      mock<any>({
        targetRevision: 3,
      }),
      records,
      headRecord
    )
  ).toThrow(
    `Missing older records to insert new record. Oldest revision: 4, Submitted targetRevision: 3`
  );
});

it('throws error if submitted record targets future revision', () => {
  expect(() =>
    processSubmittedRecord(
      mock<any>({
        targetRevision: 8,
      }),
      records,
      headRecord
    )
  ).toThrow(
    `Cannot insert record after headRecord. headRecord revision: 7, Submitted targetRevision: 8`
  );
});
