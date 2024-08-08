import { describe, it, expect } from 'vitest';

import { DeepAnyDescription } from './description';
import { mapQueryAggregateResult } from './map-query-aggregate-result';
import { mergeQueries } from './merge-queries';
import { DeepObjectQuery, DeepQuery } from './query';

describe('result is unmodified without resolvers', () => {
  it.each([
    [
      {
        a: 1,
      },
      {
        a: 'hi',
        b: 'hi2',
      },
      {
        a: 'hi',
        b: 'hi2',
      },
    ],
    [
      {
        'a.b': 1,
      },
      {
        a: {
          b: 'hi',
        },
      },
      {
        a: {
          b: 'hi',
        },
      },
    ],
  ])('%s => %s', (query, result, expectedResult) => {
    expect(
      // @ts-expect-error
      mapQueryAggregateResult(query, mergeQueries({}, [query]), result)
    ).toStrictEqual(expectedResult);
  });
});

describe('map result with resolver', () => {
  it.each([
    [
      {
        a: 1,
      },
      {
        a: 2,
      },
      {
        a: {
          $mapAggregateResult({ result }: { result: number }) {
            return 2 * result;
          },
        },
      },
      {
        a: 4,
      },
    ],
    [
      {
        a: {
          b1: 1,
          b2: 1,
        },
      },
      {
        a: {
          b1: 10,
          b2: 20,
        },
      },
      {
        a: {
          b2: {
            $mapAggregateResult({ result }: { result: number }) {
              return 2 * result;
            },
          },
        },
      },
      {
        a: {
          b1: 10,
          b2: 40,
        },
      },
    ],
  ])('%s => %s', (query, result, description, expectedResult) => {
    expect(
      mapQueryAggregateResult(
        query as DeepQuery<unknown>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mergeQueries({}, [query as DeepObjectQuery<any>]),
        result,
        {
          descriptions: [description as DeepAnyDescription<unknown>],
        }
      )
    ).toStrictEqual(expectedResult);
  });
});

describe('map array result with resolver', () => {
  it.each([
    [
      {
        $query: {
          a: 1,
        },
      },
      [{ a: 2 }, { a: 3 }],
      {
        $mapAggregateResult({ result }: { result: { a: number }[] }) {
          return result.map(({ a }) => ({ a: a * 2 }));
        },
      },
      [{ a: 4 }, { a: 6 }],
    ],
    [
      {
        $query: {
          a: 1,
        },
      },
      [{ a: 2 }, { a: 3 }],
      {
        a: {
          $mapAggregateResult({ result }: { result: number }) {
            return result * 2;
          },
        },
      },
      [{ a: 4 }, { a: 6 }],
    ],
    [
      {
        items: {
          $query: {
            a: 1,
          },
        },
      },
      {
        items: [{ a: 2 }, { a: 3 }],
      },
      {
        items: {
          a: {
            $mapAggregateResult({ result }: { result: number }) {
              return result * 2;
            },
          },
        },
      },
      {
        items: [{ a: 4 }, { a: 6 }],
      },
    ],
  ])('%s => %s', (query, result, description, expectedResult) => {
    expect(
      mapQueryAggregateResult(
        query as DeepQuery<unknown>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mergeQueries({}, [query as DeepObjectQuery<any>]),
        result,
        {
          descriptions: [description as DeepAnyDescription<unknown>],
        }
      )
    ).toStrictEqual(expectedResult);
  });
});

describe('map nested array resolvers', () => {
  it.each([
    [
      {
        items: {
          $query: {
            version: 1,
            records: {
              $query: {
                revision: 1,
              },
            },
          },
        },
      },
      {
        items: {
          array: [
            {
              version: 4,
              records: {
                array: [
                  {
                    revision: 2,
                  },
                ],
              },
            },
          ],
        },
      },
      {
        items: {
          $mapAggregateResult({
            result,
          }: {
            result: {
              array: unknown;
            };
          }) {
            return result.array;
          },
          records: {
            $mapAggregateResult({
              result,
            }: {
              result: {
                array: unknown;
              };
            }) {
              return result.array;
            },
          },
        },
      },
      {
        items: [
          {
            version: 4,
            records: [
              {
                revision: 2,
              },
            ],
          },
        ],
      },
    ],
  ])('(%s,%s,%s) => %s', (query, result, description, expectedResult) => {
    expect(
      mapQueryAggregateResult(
        query as DeepQuery<unknown>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mergeQueries({}, [query as DeepObjectQuery<any>]),
        result,
        {
          descriptions: [description as DeepAnyDescription<unknown>],
        }
      )
    ).toStrictEqual(expectedResult);
  });
});
