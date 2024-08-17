import { expect, it } from 'vitest';

import { mergeQueries } from './merge-queries';
import { RelayPagination } from '../pagination/relay-array-pagination';

interface Item {
  name: string;
  quantity: number;
}

interface SubData {
  value: number;
  foo: boolean;
}

interface Data {
  title: string;
  other: string;
  items: Item[];
  sub: SubData;
}

type QueryableData =
  | Data
  | { items: { $pagination: RelayPagination<number> }; $id1?: string; $id2?: string };

it('merges two root properties', () => {
  expect(
    mergeQueries<QueryableData>([
      {
        title: 1,
      },
      {
        other: 1,
      },
    ])
  ).toStrictEqual({
    title: 1,
    other: 1,
  });
});

it('merges two nested properties', () => {
  expect(
    mergeQueries<QueryableData>([
      {
        sub: {
          foo: 1,
        },
      },
      {
        sub: {
          value: 1,
        },
      },
    ])
  ).toStrictEqual({
    sub: {
      foo: 1,
      value: 1,
    },
  });
});

it('merges two different level nested properties', () => {
  expect(
    mergeQueries<QueryableData>([
      {
        title: 1,
      },
      {
        sub: {
          value: 1,
        },
      },
    ])
  ).toStrictEqual({
    title: 1,
    sub: {
      value: 1,
    },
  });
});

it('merges different arguments into array', () => {
  expect(
    mergeQueries<QueryableData>([
      {
        items: {
          $pagination: {
            first: 5,
          },
          name: 1,
        },
      },
      {
        items: {
          $pagination: {
            first: 8,
          },
          quantity: 1,
        },
      },
    ])
  ).toStrictEqual({
    items: {
      name: 1,
      quantity: 1,
      $args: [
        {
          $pagination: {
            first: 5,
          },
        },
        {
          $pagination: {
            first: 8,
          },
        },
      ],
    },
  });
});

it('ignores duplicate arg', () => {
  expect(
    mergeQueries<QueryableData>([
      {
        items: {
          $pagination: {
            last: 2,
          },
          name: 1,
        },
      },
      {
        items: {
          $pagination: {
            last: 2,
          },
          quantity: 1,
        },
      },
    ])
  ).toStrictEqual({
    items: {
      $args: [
        {
          $pagination: {
            last: 2,
          },
        },
      ],
      quantity: 1,
      name: 1,
    },
  });
});

it('keeps different sets of args', () => {
  expect(
    mergeQueries<QueryableData>([
      {
        $id1: 'a1',
        $id2: 'a2',
        title: 1,
      },
      {
        $id1: 'b1',
        $id2: 'b2',
        other: 1,
      },
      {
        $id2: 'c',
        other: 1,
      },
    ])
  ).toStrictEqual({
    $args: [
      {
        $id1: 'a1',
        $id2: 'a2',
      },
      {
        $id1: 'b1',
        $id2: 'b2',
      },
      {
        $id2: 'c',
      },
    ],
    title: 1,
    other: 1,
  });
});
