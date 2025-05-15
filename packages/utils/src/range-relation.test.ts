import { describe, expect, it } from 'vitest';

import { RangeRelation, rangeRelation } from './range-relation';

describe('equal length ranges', () => {
  it.each<[[number, number, number, number], RangeRelation]>([
    [
      [2, 5, 6, 9],
      {
        overlap: false,
        position: 'left',
        distance: 2,
      },
    ],
    [
      [3, 6, 6, 9],
      {
        overlap: false,
        position: 'left',
        distance: 1,
      },
    ],
    [
      [4, 7, 6, 9],
      {
        overlap: true,
        position: 'left',
        distance: 0,
      },
    ],
    [
      [5, 8, 6, 9],
      {
        overlap: true,
        position: 'left',
        distance: 0,
      },
    ],
    [
      [6, 9, 6, 9],
      {
        overlap: true,
        position: 'inside',
        distance: 0,
      },
    ],
    [
      [7, 10, 6, 9],
      {
        overlap: true,
        position: 'right',
        distance: 0,
      },
    ],
    [
      [8, 11, 6, 9],
      {
        overlap: true,
        position: 'right',
        distance: 0,
      },
    ],
    [
      [9, 12, 6, 9],
      {
        overlap: false,
        position: 'right',
        distance: 1,
      },
    ],
    [
      [10, 13, 6, 9],
      {
        overlap: false,
        position: 'right',
        distance: 2,
      },
    ],
  ])('[%s;%s],[%s;%s] => %s', ([x1, x2, y1, y2], expected) => {
    expect(rangeRelation(x1, x2, y1, y2)).toStrictEqual(expected);
  });
});

describe('smaller length range', () => {
  it.each<[[number, number, number, number], RangeRelation]>([
    [
      [3, 5, 6, 9],
      {
        overlap: false,
        position: 'left',
        distance: 2,
      },
    ],
    [
      [4, 6, 6, 9],
      {
        overlap: false,
        position: 'left',
        distance: 1,
      },
    ],
    [
      [5, 7, 6, 9],
      {
        overlap: true,
        position: 'left',
        distance: 0,
      },
    ],
    [
      [6, 8, 6, 9],
      {
        overlap: true,
        position: 'inside',
        distance: 0,
      },
    ],
    [
      [7, 9, 6, 9],
      {
        overlap: true,
        position: 'inside',
        distance: 0,
      },
    ],
    [
      [8, 10, 6, 9],
      {
        overlap: true,
        position: 'right',
        distance: 0,
      },
    ],
    [
      [9, 11, 6, 9],
      {
        overlap: false,
        position: 'right',
        distance: 1,
      },
    ],
    [
      [10, 12, 6, 9],
      {
        overlap: false,
        position: 'right',
        distance: 2,
      },
    ],
  ])('[%s;%s],[%s;%s] => %s', ([x1, x2, y1, y2], expected) => {
    expect(rangeRelation(x1, x2, y1, y2)).toStrictEqual(expected);
  });
});

describe('bigger length range', () => {
  it.each<[[number, number, number, number], RangeRelation]>([
    [
      [0, 5, 6, 9],
      {
        overlap: false,
        position: 'left',
        distance: 2,
      },
    ],
    [
      [1, 6, 6, 9],
      {
        overlap: false,
        position: 'left',
        distance: 1,
      },
    ],
    [
      [2, 7, 6, 9],
      {
        overlap: true,
        position: 'left',
        distance: 0,
      },
    ],
    [
      [3, 8, 6, 9],
      {
        overlap: true,
        position: 'left',
        distance: 0,
      },
    ],
    [
      [4, 9, 6, 9],
      {
        overlap: true,
        position: 'outside',
        distance: 0,
      },
    ],
    [
      [5, 10, 6, 9],
      {
        overlap: true,
        position: 'outside',
        distance: 0,
      },
    ],
    [
      [6, 11, 6, 9],
      {
        overlap: true,
        position: 'outside',
        distance: 0,
      },
    ],
    [
      [7, 12, 6, 9],
      {
        overlap: true,
        position: 'right',
        distance: 0,
      },
    ],
    [
      [8, 13, 6, 9],
      {
        overlap: true,
        position: 'right',
        distance: 0,
      },
    ],
    [
      [9, 14, 6, 9],
      {
        overlap: false,
        position: 'right',
        distance: 1,
      },
    ],
    [
      [10, 15, 6, 9],
      {
        overlap: false,
        position: 'right',
        distance: 2,
      },
    ],
  ])('[%s;%s],[%s;%s] => %s', ([x1, x2, y1, y2], expected) => {
    expect(rangeRelation(x1, x2, y1, y2)).toStrictEqual(expected);
  });
});
