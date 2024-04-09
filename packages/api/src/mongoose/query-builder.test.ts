import { describe, expect, it } from 'vitest';
import { MergedProjection, Projection, mergeProjections } from './query-builder';

describe('mergeProjections', () => {
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

  it.each<[Projection<Data>[], MergedProjection<Data>]>([
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
            $project: {
              name: 1,
            },
            $pagination: {
              first: 5,
            },
          },
        },
        {
          items: {
            $project: {
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
          $project: {
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
            $project: {
              name: 1,
            },
            $pagination: {
              last: 2,
              index: 2,
            },
          },
        },
      ],
      {
        items: {
          $project: {
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
    expect(mergeProjections({}, mergeData)).toStrictEqual(expected);
  });
});
