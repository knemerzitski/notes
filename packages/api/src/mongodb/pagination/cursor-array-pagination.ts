import isEqual from 'lodash.isequal';
import { Struct } from 'superstruct';

import { isNonEmptyArray } from '~utils/array/is-non-empty-array';
import { isObjectLike } from '~utils/type-guards/is-object-like';

import {
  CursorAfterPagination,
  CursorBeforePagination,
  CursorPagination,
  CursorFirstPagination,
  CursorLastPagination,
} from './cursor-struct';

/**
 * From beginning up to first number of results.
 * @param first Must be a positive number > 0
 */
export function sliceFirst(arrayFieldPath: string, first: number) {
  return {
    $ifNull: [
      {
        $slice: [`$${arrayFieldPath}`, 0, first],
      },
      [],
    ],
  };
}

/**
 * From end up to last number of results.
 * @param last Must be a positive number > 0
 */
export function sliceLast(arrayFieldPath: string, last: number) {
  return {
    $ifNull: [
      {
        $slice: [`$${arrayFieldPath}`, -last, last],
      },
      [],
    ],
  };
}

export interface SliceAfterInput<TCursor> {
  /**
   * Field path to array to be sliced.
   */
  arrayFieldPath: string;
  /**
   * Optional path to array value in item. Used to find item in array.
   * If undefined then after value itself is compared again array elements.
   */
  itemPath?: string;
  sliceList: Readonly<
    [CursorAfterPagination<TCursor>, ...CursorAfterPagination<TCursor>[]]
  >;
}

export interface SliceAfterAggregateResult<TItem> {
  /**
   * Concatenated array of all slices. Matches order of input slices.
   */
  array: TItem[];
  /**
   * Size of each slice in {@link array}. Matches order of input slices.
   */
  sizes: number[];
}

/**
 * Slice an array from multiple places with a single operation.
 * Can specify after element and first number of count.
 *
 */
export function sliceAfter<T>({
  arrayFieldPath,
  itemPath,
  sliceList,
}: SliceAfterInput<T>) {
  const arrayField = itemPath ? `${arrayFieldPath}.${itemPath}` : arrayFieldPath;

  return {
    $reduce: {
      input: sliceList.map(({ after, first }) => ({
        $let: {
          vars: {
            start: {
              $add: [
                {
                  $indexOfArray: [`$${arrayField}`, after],
                },
                1,
              ],
            },
          },
          in: {
            $cond: [
              { $gt: ['$$start', 0] },
              {
                $slice: [
                  `$${arrayFieldPath}`,
                  '$$start',
                  first ?? { $size: { $ifNull: [`$${arrayFieldPath}`, []] } },
                ],
              },
              [],
            ],
          },
        },
      })),
      initialValue: {
        array: [],
        sizes: [],
      },
      in: {
        array: {
          $concatArrays: ['$$value.array', '$$this'],
        },
        sizes: {
          $concatArrays: ['$$value.sizes', [{ $size: { $ifNull: ['$$this', []] } }]],
        },
      },
    },
  };
}

export interface SliceBeforeInput<TCursor> {
  /**
   * Field path to array to be sliced.
   */
  arrayFieldPath: string;
  /**
   * Optional path to array value in item. Used to find item in array.
   * If undefined then after value itself is compared again array elements.
   */
  itemPath?: string;
  sliceList: Readonly<
    [CursorBeforePagination<TCursor>, ...CursorBeforePagination<TCursor>[]]
  >;
}

export interface SliceBeforeAggregateResult<TItem> {
  /**
   * Concatenated array of all slices. Matches order of input slices.
   */
  array: TItem[];
  /**
   * Size of each slice in {@link array}. Matches order of input slices.
   */
  sizes: number[];
}

/**
 * From before up to last number of results. Before is excluded.
 */
export function sliceBefore<T>({
  arrayFieldPath,
  itemPath,
  sliceList,
}: SliceBeforeInput<T>) {
  const arrayField = itemPath ? `${arrayFieldPath}.${itemPath}` : arrayFieldPath;

  return {
    $reduce: {
      input: sliceList.map(({ before, last }) => ({
        $let: {
          vars: {
            endExclusive: { $indexOfArray: [`$${arrayField}`, before] },
          },
          in: {
            $cond: [
              { $gte: ['$$endExclusive', 0] },
              {
                $slice: [
                  `$${arrayFieldPath}`,
                  { $max: [{ $subtract: ['$$endExclusive', last] }, 0] },
                  { $min: [last, '$$endExclusive'] },
                ],
              },
              [],
            ],
          },
        },
      })),
      initialValue: {
        array: [],
        sizes: [],
      },
      in: {
        array: {
          $concatArrays: ['$$value.array', '$$this'],
        },
        sizes: {
          $concatArrays: ['$$value.sizes', [{ $size: { $ifNull: ['$$this', []] } }]],
        },
      },
    },
  };
}

export function applyLimit(
  value: number | undefined | null,
  defaultLimit: number | undefined,
  maxLimit: number
): number {
  if (value == null) {
    if (defaultLimit && maxLimit) {
      return Math.min(defaultLimit, maxLimit);
    }
    return defaultLimit ?? maxLimit;
  }
  return Math.min(maxLimit, value);
}

export function maybeApplyLimit(
  value?: number | null,
  defaultLimit?: number,
  maxLimit?: number
) {
  if (value == null) {
    if (defaultLimit && maxLimit) {
      return Math.min(defaultLimit, maxLimit);
    }
    return defaultLimit ?? maxLimit;
  }
  if (maxLimit != null) {
    return Math.min(maxLimit, value);
  }
  return value;
}

export type CursorArrayPaginationConfig = Required<
  Pick<CursorArrayPaginationInput<never>, 'maxLimit'>
> &
  Partial<Pick<CursorArrayPaginationInput<never>, 'defaultLimit' | 'defaultSlice'>>;

export interface CursorArrayPaginationInput<TCursor> {
  arrayFieldPath: string;
  /**
   * Optional path to array value in item. Used to find item in array.
   * If undefined then after value itself is compared again array elements.
   */
  arrayItemPath?: string;
  defaultLimit?: number;
  maxLimit?: number;
  paginations?: CursorPagination<TCursor>[];
  /**
   * How to slice when no arguments are provided.
   * @default "start"
   */
  defaultSlice?: 'start' | 'end';
}

export interface CursorArrayPaginationAggregateResult<TItem> {
  /**
   * Array containing all paginations.
   * Order of array: [maxFirst, maxLast, ...after, ...before].
   */
  array: readonly TItem[];
  /**
   * Size of slices for pagination in {@link array}.
   * Order of sizes: [maxFirst, maxLast, ...after, ...before]
   *
   */
  sizes?: [number, number, ...number[]];
}

export function isCursorArrayPaginationAggregateResult<TItem>(
  value: unknown
): value is CursorArrayPaginationAggregateResult<TItem> {
  if (!isObjectLike(value)) return false;
  if (!Array.isArray(value.array)) return false;
  if (value.sizes != null && !Array.isArray(value.sizes)) return false;
  return true;
}

export function cursorArrayPagination<TCursor>(
  input: CursorArrayPaginationInput<TCursor>
): Document {
  let maxFirst = -1;
  let maxLast = -1;
  const sliceAfterList: CursorAfterPagination<TCursor>[] = [];
  const sliceBeforeList: CursorBeforePagination<TCursor>[] = [];
  if (input.paginations) {
    for (const pagination of input.paginations) {
      let isForward = false;
      if ('after' in pagination || 'first' in pagination) {
        isForward = true;
        const first = maybeApplyLimit(
          pagination.first,
          input.defaultLimit,
          input.maxLimit
        );
        if (pagination.after != null) {
          sliceAfterList.push({
            after: pagination.after,
            first: first,
          });
        } else if (pagination.first != null && first != null) {
          maxFirst = Math.max(maxFirst, first);
        }
      }

      if ('before' in pagination || 'last' in pagination) {
        if (isForward) {
          throw new Error(
            'Both forwards and backwards pagination is not supported in a single input'
          );
        }
        const last = maybeApplyLimit(pagination.last, input.defaultLimit, input.maxLimit);
        if (pagination.before != null) {
          sliceBeforeList.push({
            before: pagination.before,
            last,
          });
        } else if (pagination.last != null && last != null) {
          maxLast = Math.max(maxLast, last);
        }
      }
    }

    const hasAnyPagination =
      maxFirst !== -1 ||
      maxLast !== -1 ||
      sliceAfterList.length > 0 ||
      sliceBeforeList.length > 0;
    if (hasAnyPagination) {
      const emptyPagination = {
        array: [],
        sizes: [0],
      };
      const skipPagination = {
        array: [],
        sizes: [],
      };

      return {
        $reduce: {
          input: [
            maxFirst > 0
              ? {
                  array: sliceFirst(input.arrayFieldPath, maxFirst),
                  sizes: null,
                }
              : emptyPagination,
            maxLast > 0
              ? {
                  array: sliceLast(input.arrayFieldPath, maxLast),
                  sizes: null,
                }
              : emptyPagination,
            isNonEmptyArray(sliceAfterList)
              ? sliceAfter({
                  arrayFieldPath: input.arrayFieldPath,
                  itemPath: input.arrayItemPath,
                  sliceList: sliceAfterList,
                })
              : skipPagination,
            isNonEmptyArray(sliceBeforeList)
              ? sliceBefore({
                  arrayFieldPath: input.arrayFieldPath,
                  itemPath: input.arrayItemPath,
                  sliceList: sliceBeforeList,
                })
              : skipPagination,
          ],
          initialValue: {
            array: [],
            sizes: [],
          },
          in: {
            array: {
              $concatArrays: ['$$value.array', '$$this.array'],
            },
            sizes: {
              $concatArrays: [
                '$$value.sizes',
                {
                  $cond: [
                    { $eq: ['$$this.sizes', null] },
                    [{ $size: { $ifNull: ['$$this.array', []] } }],
                    '$$this.sizes',
                  ],
                },
              ],
            },
          },
        },
      };
    }
  }

  const limit = input.defaultLimit ?? input.maxLimit;

  if (limit) {
    if (input.defaultSlice === 'end') {
      return {
        array: sliceLast(input.arrayFieldPath, limit),
      };
    } else {
      return {
        array: sliceFirst(input.arrayFieldPath, limit),
      };
    }
  }

  return {
    array: `$${input.arrayFieldPath}`,
  };
}

/**
 * Structure input arrayPaths
 * `
 * arrayPaths[0] = {
 *  array: [...],
 *  sizes: [...]
 * };
 * arrayPaths[1] = {
 *  array: [...],
 *  sizes: [...]
 * }
 * ` \
 * Structure output targetPath
 * `
 * targetPath = {
 *  array: [...],
 *  slices: [...]
 * }
 * `
 */
export function cursorMultiArrayConcat(targetPath: string, arrayPaths: string[]) {
  return [
    {
      $set: {
        [targetPath]: {
          $reduce: {
            input: arrayPaths.map((path) => ({
              array: { $ifNull: [`$${path}.array`, []] },
              subSizes: `$${path}.sizes`,
            })),
            initialValue: {
              array: [],
              slices: [],
            },
            in: {
              array: {
                $concatArrays: ['$$value.array', '$$this.array'],
              },
              slices: {
                $concatArrays: [
                  '$$value.slices',
                  [
                    {
                      index: { $size: '$$value.array' },
                      size: { $size: `$$this.array` },
                      subSizes: '$$this.subSizes',
                    },
                  ],
                ],
              },
            },
          },
        },
      },
    },
  ];
}

/**
 * Structure input multiArrayPath
 * `
 * multiArrayPath = {
 *  array: [...],
 *  slices: [...]
 * }
 * `
 * Structure output targetArrayPaths
 * `
 * targetArrayPaths[0] = {
 *  array: [...],
 *  sizes: [...]
 * };
 * targetArrayPaths[1] = {
 *  array: [...],
 *  sizes: [...]
 * }
 * ` \
 */
export function cursorMultiArraySplit(
  multiArrayPath: string,
  targetArrayPaths: string[]
) {
  //
  return [
    {
      $set: Object.fromEntries(
        targetArrayPaths.map((path, index) => [
          path,
          {
            $let: {
              vars: {
                slice: {
                  $arrayElemAt: [`$${multiArrayPath}.slices`, index],
                },
              },
              in: {
                array: {
                  $cond: [
                    {
                      $gt: ['$$slice.size', 0],
                    },
                    {
                      $slice: [
                        `$${multiArrayPath}.array`,
                        '$$slice.index',
                        '$$slice.size',
                      ],
                    },
                    [],
                  ],
                },
                sizes: `$$slice.subSizes`,
              },
            },
          },
        ])
      ),
    },
  ];
}

export function cursorArrayPaginationMapAggregateResult<TCursor, TItem>(
  pagination:
    | NonNullable<CursorArrayPaginationInput<TCursor>['paginations']>[0]
    | undefined,
  allPaginations: CursorArrayPaginationInput<TCursor>['paginations'] = [],
  aggregateResult: CursorArrayPaginationAggregateResult<TItem>,
  cursor: Struct<TCursor, null>
): readonly TItem[] {
  if (!pagination || aggregateResult.array.length === 0) {
    return aggregateResult.array;
  }

  const sizes = aggregateResult.sizes;
  if (sizes) {
    if (CursorFirstPagination.is(pagination)) {
      return aggregateResult.array.slice(0, Math.min(pagination.first, sizes[0]));
    } else if (CursorLastPagination.is(pagination)) {
      const end = sizes[0] + sizes[1];
      return aggregateResult.array.slice(Math.max(sizes[0], end - pagination.last), end);
    } else if (CursorAfterPagination(cursor).is(pagination)) {
      let afterIndex = 2;
      let afterSize = sizes[0] + sizes[1];

      for (const otherPagination of allPaginations) {
        if (CursorAfterPagination(cursor).is(otherPagination)) {
          const nextSize = sizes[afterIndex];
          if (nextSize == null) {
            throw new Error(`Expected size at index ${afterIndex}`);
          }
          if (isEqual(pagination, otherPagination)) {
            return aggregateResult.array.slice(afterSize, afterSize + nextSize);
          } else {
            afterSize += nextSize;
            afterIndex++;
          }
        }
      }
    } else {
      let beforeIndex = allPaginations.reduce(
        (a, b) => a + (CursorAfterPagination(cursor).is(b) ? 1 : 0),
        2
      );
      let beforeSize = sizes
        .slice(2, beforeIndex)
        .reduce((a, b) => a + b, sizes[0] + sizes[1]);

      for (const otherPagination of allPaginations) {
        if (CursorBeforePagination(cursor).is(otherPagination)) {
          const nextSize = sizes[beforeIndex];
          if (nextSize == null) {
            throw new Error(`Expected size at index ${beforeIndex}`);
          }

          if (isEqual(pagination, otherPagination)) {
            return aggregateResult.array.slice(beforeSize, beforeSize + nextSize);
          } else {
            beforeSize += nextSize;
            beforeIndex++;
          }
        }
      }
    }
  } else {
    if (CursorFirstPagination.is(pagination)) {
      return aggregateResult.array.slice(
        0,
        Math.min(pagination.first, aggregateResult.array.length)
      );
    } else if (CursorLastPagination.is(pagination)) {
      const start = 0;
      const end = aggregateResult.array.length;
      return aggregateResult.array.slice(Math.max(start, end - pagination.last), end);
    }
  }

  return [];
}
