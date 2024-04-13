import { describe, expect, it } from 'vitest';
import { MergedDeepQuery, DeepQuery, mergeQueries } from './query-builder';

describe('mergeQueries', () => {
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

  it.each<[DeepQuery<Data>[], MergedDeepQuery<Data>]>([
    [
      [
        {
          title: 1,
        },
        {
          other: 1,
        },
      ],
      {
        title: 1,
        other: 1,
      },
    ],
    [
      [
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
      ],
      {
        sub: {
          foo: 1,
          value: 1,
        },
      },
    ],
    [
      [
        {
          title: 1,
        },
        {
          sub: {
            value: 1,
          },
        },
      ],
      {
        title: 1,
        sub: {
          value: 1,
        },
      },
    ],
    [
      [
        {
          items: {
            $query: {
              name: 1,
            },
            $pagination: {
              first: 5,
            },
          },
        },
        {
          items: {
            $query: {
              quantity: 1,
            },
            $pagination: {
              first: 8,
            },
          },
        },
      ],
      {
        items: {
          $query: {
            name: 1,
            quantity: 1,
          },
          $paginations: [
            {
              first: 5,
            },
            {
              first: 8,
            },
          ],
        },
      },
    ],
    [
      [
        {
          items: {
            $query: {
              name: 1,
            },
            $pagination: {
              last: 2,
            },
          },
        },
      ],
      {
        items: {
          $query: {
            name: 1,
          },
          $paginations: [
            {
              last: 2,
            },
          ],
        },
      },
    ],
  ])('%s => %s', (mergeData, expected) => {
    expect(mergeQueries({}, mergeData)).toStrictEqual(expected);
  });
});
