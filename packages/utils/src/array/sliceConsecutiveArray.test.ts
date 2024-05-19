import { it, expect } from 'vitest';
import sliceConsecutiveArray from './sliceConsecutiveArray';

const order = (item: number) => item;

it.each([
  [
    [1, 2, 3, 4, 5, 6],
    2,
    5,
    {
      items: [2, 3, 4],
    },
  ],
  [
    [1, 2, 3, 4, 5, 6],
    2,
    3,
    {
      items: [2],
    },
  ],
  [
    [1, 2, 3, 5, 6, 7],
    2,
    7,
    {
      items: [2, 3, 5, 6],
      missing: {
        before: 5,
        last: 1,
      },
    },
  ],
  [
    [0, 1, 2, 4, 5, 6, 8, 9, 11, 12, 14, 15],
    2,
    15,
    {
      items: [2, 4, 5, 6, 8, 9, 11, 12, 14],
      missing: {
        before: 14,
        last: 11,
      },
    },
  ],
  [
    [],
    2,
    4, // 2,3
    {
      items: [],
      missing: {
        before: 4,
        last: 2,
      },
    },
  ],
  [
    [4, 5, 6, 7],
    0,
    3, //0,1,2
    {
      items: [],
      missing: {
        before: 3,
        last: 3,
      },
    },
  ],
  [
    [4, 5, 6, 7],
    1,
    4, //1,2,3
    {
      items: [],
      missing: {
        before: 4,
        last: 3,
      },
    },
  ],
  [
    [4, 5, 6, 7],
    2,
    5, //2,3,4
    {
      items: [4],
      missing: {
        before: 4,
        last: 2,
      },
    },
  ],
  [
    [4, 5, 6, 7],
    3,
    6, //3,4,5
    {
      items: [4, 5],
      missing: {
        before: 4,
        last: 1,
      },
    },
  ],
  [
    [4, 5, 6, 7],
    4,
    7, //4,5,6
    {
      items: [4, 5, 6],
    },
  ],
  [
    [4, 5, 6, 7],
    5,
    8, //5,6,7
    {
      items: [5, 6, 7],
    },
  ],
  [
    [4, 5, 6, 7],
    6,
    9, //6,7,8
    {
      items: [6, 7],
      missing: {
        before: 9,
        last: 1,
      },
    },
  ],
  [
    [4, 5, 6, 7],
    7,
    10, //7,8,9
    {
      items: [7],
      missing: {
        before: 10,
        last: 2,
      },
    },
  ],
  [
    [4, 5, 6, 7],
    8,
    11, //8,9,10
    {
      items: [],
      missing: {
        before: 11,
        last: 3,
      },
    },
  ],
  [
    [4, 5, 6, 7],
    9,
    12, //9,10,11
    {
      items: [],
      missing: {
        before: 12,
        last: 3,
      },
    },
  ],
  [
    [4, 5, 6, 7],
    2,
    10, //2,3,4,5,6,7,8,9
    {
      items: [4, 5, 6, 7],
      missing: {
        before: 10,
        last: 8,
      },
    },
  ],
  [
    [4, 5, 7],
    2,
    10, //2,3,4,5,6,7,8,9
    {
      items: [4, 5, 7],
      missing: {
        before: 10,
        last: 8,
      },
    },
  ],
  [
    [1, 2, 3, 5, 6, 7],
    1,
    10, //1,2,3,4,5,6,7,8,9
    {
      items: [1, 2, 3, 5, 6, 7],
      missing: {
        before: 10,
        last: 6,
      },
    },
  ],
  [
    [3, 4, 5, 7, 8, 9, 10, 11],
    1,
    10, //1,2,3,4,5,6,7,8,9
    {
      items: [3, 4, 5, 7, 8, 9],
      missing: {
        before: 7,
        last: 6,
      },
    },
  ],
  [
    [3, 4, 5],
    4,
    4,
    {
      items: [],
    },
  ],
  [
    [3, 4, 5],
    8,
    8,
    {
      items: [],
    },
  ],
])('(%s, start: %s, end: %s) => %s', (arr, startItem, endItem, expectedResult) => {
  expect(sliceConsecutiveArray(arr, startItem, endItem, order)).toEqual(expectedResult);
});
