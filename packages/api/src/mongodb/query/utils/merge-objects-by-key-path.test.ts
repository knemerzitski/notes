import { expect, it } from 'vitest';

import { mergeObjectsByKeyPath } from './merge-objects-by-key-path';

it.each([
  [
    [
      {
        key: {
          text: 1,
        },
        value: {
          text: 'hi',
          other: 5,
        },
      },
      {
        key: {
          other: 1,
        },
        value: {
          text: 'wrong',
          other: 1,
        },
      },
    ],
    {
      text: 'hi',
      other: 1,
    },
  ],
  [
    [
      {
        key: {
          a: {
            b: 1,
          },
        },
        value: {
          a: {
            b: 'val',
          },
        },
      },
    ],
    {
      a: {
        b: 'val',
      },
    },
  ],
  [
    [
      {
        key: {
          a: 1,
        },
        value: {
          a: 'aaaa',
        },
      },
    ],
    {
      a: 'aaaa',
    },
  ],
  [
    [
      {
        key: {
          a: {
            b: {
              c1: 1,
              c2: 1,
            },
          },
        },
        value: {
          a: {
            b: {
              c1: 'c1',
              c2: 'c2',
            },
          },
        },
      },
      {
        key: {
          a: {
            b: {
              c2: 1,
            },
            o: 1,
          },
        },
        value: {
          a: {
            b: {
              c1: 'ignore',
              c2: 'c222',
            },
            o: 'o',
          },
        },
      },
    ],
    {
      a: {
        b: {
          c1: 'c1',
          c2: 'c222',
        },
        o: 'o',
      },
    },
  ],
  [
    [
      {
        key: {
          a: {
            r: 1,
          },
        },
        value: {
          a: [
            {
              r: '1',
              g: '2',
            },
            {
              r: '2',
              g: '2',
            },
            {
              g: '2',
            },
          ],
        },
      },
    ],
    {
      a: [
        {
          r: '1',
        },
        {
          r: '2',
        },
        {},
      ],
    },
  ],
  [
    [
      {
        key: {
          a: 1,
          b: 1,
        },
        value: {
          a: 'ok',
        },
      },
    ],
    {
      a: 'ok',
    },
  ],
  [
    [
      {
        key: {
          a: {
            b: {
              d: 1,
            },
            g: {
              no: 1,
            },
          },
          l: 1,
        },
        value: {
          a: {
            b: {
              d: 'aa',
            },
          },
          l: 'ok',
        },
      },
    ],
    {
      a: {
        b: {
          d: 'aa',
        },
      },
      l: 'ok',
    },
  ],
  [
    [
      {
        key: {
          collabText: {
            headText: {
              revision: 1,
            },
          },
        },
        value: {
          _id: 'id',
          collabText: undefined,
        },
      },
    ],
    {},
  ],
])('%s => %s', (entries, expectedResult) => {
  expect(
    mergeObjectsByKeyPath(entries.map((entry) => [entry.key, entry.value]))
  ).toStrictEqual(expectedResult);
});
