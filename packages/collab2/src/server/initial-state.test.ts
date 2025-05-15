import { expect, it } from 'vitest';
import { initialState } from './initial-state';
import { Changeset } from '../common/changeset';
import { Selection } from '../common/selection';

it('empty', () => {
  const state = initialState();

  expect(state).toMatchInlineSnapshot(`
    {
      "headRecord": {
        "revision": 0,
        "text": "0:",
      },
      "records": [],
      "tailRecord": {
        "revision": 0,
        "text": "0:",
      },
    }
  `);
});

it('with one record', () => {
  const state = initialState([
    {
      authorId: 'A',
      idempotencyId: 'a',
      revision: 1,
      changeset: Changeset.parse('0:"hi"'),
      selectionInverse: Selection.parse('0'),
      selection: Selection.parse('2'),
    },
  ]);

  expect(state).toMatchInlineSnapshot(`
    {
      "headRecord": {
        "revision": 1,
        "text": "0:"hi"",
      },
      "records": [
        {
          "authorId": "A",
          "changeset": "0:"hi"",
          "idempotencyId": "a",
          "inverse": "2:",
          "revision": 1,
          "selection": "2",
          "selectionInverse": "0",
        },
      ],
      "tailRecord": {
        "revision": 0,
        "text": "0:",
      },
    }
  `);
});

it('with two records', () => {
  const state = initialState([
    {
      authorId: 'A',
      idempotencyId: 'a',
      revision: 1,
      changeset: Changeset.parse('0:"a"'),
      selectionInverse: Selection.parse('0'),
      selection: Selection.parse('1'),
    },
    {
      authorId: 'A',
      idempotencyId: 'a',
      revision: 2,
      changeset: Changeset.parse('1:0,"b"'),
      selectionInverse: Selection.parse('1'),
      selection: Selection.parse('2'),
    },
  ]);

  expect(state).toMatchInlineSnapshot(`
    {
      "headRecord": {
        "revision": 2,
        "text": "0:"ab"",
      },
      "records": [
        {
          "authorId": "A",
          "changeset": "0:"a"",
          "idempotencyId": "a",
          "inverse": "1:",
          "revision": 1,
          "selection": "1",
          "selectionInverse": "0",
        },
        {
          "authorId": "A",
          "changeset": "1:0,"b"",
          "idempotencyId": "a",
          "inverse": "2:0",
          "revision": 2,
          "selection": "2",
          "selectionInverse": "1",
        },
      ],
      "tailRecord": {
        "revision": 0,
        "text": "0:",
      },
    }
  `);
});
