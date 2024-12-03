import { describe, expect, it } from 'vitest';

import { RangeRelation, rangeRelation } from './range-relation';

describe('equal length ranges', () => {
  it.each<[[number, number, number, number], RangeRelation]>([
    [
      [2, 4, 6, 8],
      {
        overlap: false,
        position: 'left',
        connected: false,
      },
    ],
    [
      [3, 5, 6, 8],
      {
        overlap: false,
        position: 'left',
        connected: true,
      },
    ],
    [
      [4, 6, 6, 8],
      {
        overlap: true,
        position: 'left',
        connected: false,
      },
    ],
    [
      [5, 7, 6, 8],
      {
        overlap: true,
        position: 'left',
        connected: false,
      },
    ],
    [
      [6, 8, 6, 8],
      {
        overlap: true,
        position: 'inside',
        connected: false,
      },
    ],
    [
      [7, 9, 6, 8],
      {
        overlap: true,
        position: 'right',
        connected: false,
      },
    ],
    [
      [8, 10, 6, 8],
      {
        overlap: true,
        position: 'right',
        connected: false,
      },
    ],
    [
      [9, 11, 6, 8],
      {
        overlap: false,
        position: 'right',
        connected: true,
      },
    ],
    [
      [10, 12, 6, 8],
      {
        overlap: false,
        position: 'right',
        connected: false,
      },
    ],
  ])('[%s;%s],[%s;%s] => %s', ([x1, x2, y1, y2], expected) => {
    expect(rangeRelation(x1, x2, y1, y2)).toStrictEqual(expected);
  });
});

describe('smaller length range', () => {
  it.each<[[number, number, number, number], RangeRelation]>([
    [
      [3, 4, 6, 8],
      {
        overlap: false,
        position: 'left',
        connected: false,
      },
    ],
    [
      [4, 5, 6, 8],
      {
        overlap: false,
        position: 'left',
        connected: true,
      },
    ],
    [
      [5, 6, 6, 8],
      {
        overlap: true,
        position: 'left',
        connected: false,
      },
    ],
    [
      [6, 7, 6, 8],
      {
        overlap: true,
        position: 'inside',
        connected: false,
      },
    ],
    [
      [7, 8, 6, 8],
      {
        overlap: true,
        position: 'inside',
        connected: false,
      },
    ],
    [
      [8, 9, 6, 8],
      {
        overlap: true,
        position: 'right',
        connected: false,
      },
    ],
    [
      [9, 10, 6, 8],
      {
        overlap: false,
        position: 'right',
        connected: true,
      },
    ],
    [
      [10, 11, 6, 8],
      {
        overlap: false,
        position: 'right',
        connected: false,
      },
    ],
  ])('[%s;%s],[%s;%s] => %s', ([x1, x2, y1, y2], expected) => {
    expect(rangeRelation(x1, x2, y1, y2)).toStrictEqual(expected);
  });
});

describe('bigger length range', () => {
  it.each<[[number, number, number, number], RangeRelation]>([
    [
      [0, 4, 6, 8],
      {
        overlap: false,
        position: 'left',
        connected: false,
      },
    ],
    [
      [1, 5, 6, 8],
      {
        overlap: false,
        position: 'left',
        connected: true,
      },
    ],
    [
      [2, 6, 6, 8],
      {
        overlap: true,
        position: 'left',
        connected: false,
      },
    ],
    [
      [3, 7, 6, 8],
      {
        overlap: true,
        position: 'left',
        connected: false,
      },
    ],
    [
      [4, 8, 6, 8],
      {
        overlap: true,
        position: 'outside',
        connected: false,
      },
    ],
    [
      [5, 9, 6, 8],
      {
        overlap: true,
        position: 'outside',
        connected: false,
      },
    ],
    [
      [6, 10, 6, 8],
      {
        overlap: true,
        position: 'outside',
        connected: false,
      },
    ],
    [
      [7, 11, 6, 8],
      {
        overlap: true,
        position: 'right',
        connected: false,
      },
    ],
    [
      [8, 12, 6, 8],
      {
        overlap: true,
        position: 'right',
        connected: false,
      },
    ],
    [
      [9, 13, 6, 8],
      {
        overlap: false,
        position: 'right',
        connected: true,
      },
    ],
    [
      [10, 14, 6, 8],
      {
        overlap: false,
        position: 'right',
        connected: false,
      },
    ],
  ])('[%s;%s],[%s;%s] => %s', ([x1, x2, y1, y2], expected) => {
    expect(rangeRelation(x1, x2, y1, y2)).toStrictEqual(expected);
  });
});
