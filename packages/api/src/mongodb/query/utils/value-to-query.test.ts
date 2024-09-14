import { describe, expect, it } from 'vitest';
import { valueToQueries, valueToQuery } from './value-to-query';

describe('valueToQuery', () => {
  it.each([
    [undefined, 1],
    ['a', 1],
    [{ a: 'foo' }, { a: 1 }],
    [
      {
        a: {
          b: 'bar',
        },
      },
      { a: { b: 1 } },
    ],
    [
      {
        a: [
          {
            b: 'a',
          },
          {
            b: 'b',
          },
        ],
      },
      { a: { b: 1 } },
    ],
    [
      {
        a: [
          {
            b: 'a',
          },
          {
            b: 'b',
            c: 3,
          },
        ],
      },
      { a: { b: 1, c: 1 } },
    ],
  ])('%s', (value, expected) => {
    expect(valueToQuery(value)).toStrictEqual(expected);
  });
});

it('visitorFn addPermutationsByPath ', () => {
  expect(
    valueToQueries(
      {
        a: {
          b: {
            c: 'foo',
            in: {
              d: 2,
            },
          },
        },
      },
      {
        visitorFn: ({ addPermutationsByPath: variants }) => {
          variants('a.b', [
            {
              // @ts-expect-error
              $arg: 'a',
            },
            {
              // @ts-expect-error
              $arg: 'b',
            },
          ]);
        },
      }
    )
  ).toStrictEqual([
    {
      a: { b: { $arg: 'a', c: 1, in: { d: 1 } } },
    },
    {
      a: { b: { $arg: 'b', c: 1, in: { d: 1 } } },
    },
  ]);
});

it('visitorFn mergeByPath', () => {
  interface DelTest {
    a: {
      b: {
        keep: string;
        del?: string;
      };
    };
  }

  expect(
    valueToQueries<DelTest>(
      {
        a: {
          b: {
            keep: 's',
          },
        },
      },
      {
        visitorFn: ({ mergeByPath }) => {
          mergeByPath('a.b', {
            del: 1,
          });
        },
      }
    )
  ).toStrictEqual([
    {
      a: {
        b: {
          keep: 1,
          del: 1,
        },
      },
    },
  ]);
});
