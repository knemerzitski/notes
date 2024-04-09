import { PipelineStage } from 'mongoose';
import isNonEmptyArray from '~utils/array/isNonEmptyArray';

interface RelayFirstPagination {
  after?: never;
  first: number;
}

export interface RelayAfterPagination<TItem> {
  after: TItem;
  first?: number;
}

interface RelayLastPagination {
  before?: never;
  last: number;
}

export interface RelayBeforePagination<TItem> {
  before: TItem;
  last?: number;
}

export type RelayForwardsPagination<TItem> =
  | RelayFirstPagination
  | RelayAfterPagination<TItem>;
export type RelayBackwardsPagination<TItem> =
  | RelayLastPagination
  | RelayBeforePagination<TItem>;

export type RelayPagination<TItem> =
  | RelayForwardsPagination<TItem>
  | RelayBackwardsPagination<TItem>;

export function isFirstPagination<TItem>(
  pagination: RelayPagination<TItem>
): pagination is RelayFirstPagination {
  return (
    'first' in pagination &&
    pagination.first != null &&
    (!('after' in pagination) || pagination.after == null)
  );
}

export function isLastPagination<TItem>(
  pagination: RelayPagination<TItem>
): pagination is RelayLastPagination {
  return (
    'last' in pagination &&
    pagination.last != null &&
    (!('before' in pagination) || pagination.before == null)
  );
}

export function isAfterPagination<TItem>(
  pagination: RelayPagination<TItem>
): pagination is RelayAfterPagination<TItem> {
  return 'after' in pagination && pagination.after != null;
}

export function isBeforePagination<TItem>(
  pagination: RelayPagination<TItem>
): pagination is RelayBeforePagination<TItem> {
  return 'before' in pagination && pagination.before != null;
}

/**
 * From beginning up to first number of results.
 * @param first Must be a positive number > 0
 */
export function sliceFirst(arrayFieldPath: string, first: number) {
  return {
    $slice: [`$${arrayFieldPath}`, 0, first],
  };
}

/**
 * From end up to last number of results.
 * @param last Must be a positive number > 0
 */
export function sliceLast(arrayFieldPath: string, last: number) {
  return {
    $slice: [`$${arrayFieldPath}`, -last, last],
  };
}

export interface SliceAfterInput<TItem> {
  /**
   * Field path to array to be sliced.
   */
  arrayFieldPath: string;
  /**
   * Optional path to array value in item. Used to find item in array.
   * If undefined then after value itself is compared again array elements.
   */
  itemPath?: string;
  sliceList: Readonly<[RelayAfterPagination<TItem>, ...RelayAfterPagination<TItem>[]]>;
}

export interface SliceAfterOutput<TItem> {
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
                  first ?? { $size: `$${arrayFieldPath}` },
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
          $concatArrays: ['$$value.sizes', [{ $size: '$$this' }]],
        },
      },
    },
  };
}

export interface SliceBeforeInput<TItem> {
  /**
   * Field path to array to be sliced.
   */
  arrayFieldPath: string;
  /**
   * Optional path to array value in item. Used to find item in array.
   * If undefined then after value itself is compared again array elements.
   */
  itemPath?: string;
  sliceList: Readonly<[RelayBeforePagination<TItem>, ...RelayBeforePagination<TItem>[]]>;
}

export interface SliceBeforeOutput<TItem> {
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
          $concatArrays: ['$$value.sizes', [{ $size: '$$this' }]],
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

export type RelayArrayPaginationConfig = Required<
  Pick<RelayArrayPaginationInput<never>, 'maxLimit'>
> &
  Partial<Pick<RelayArrayPaginationInput<never>, 'defaultLimit' | 'defaultSlice'>>;

export interface RelayArrayPaginationInput<TItem> {
  arrayFieldPath: string;
  /**
   * Optional path to array value in item. Used to find item in array.
   * If undefined then after value itself is compared again array elements.
   */
  arrayItemPath?: string;
  defaultLimit?: number;
  maxLimit?: number;
  paginations?: RelayPagination<TItem>[];
  /**
   * How to slice when no arguments are provided.
   * @default "start"
   */
  defaultSlice?: 'start' | 'end';
}

export interface RelayArrayPaginationOutput<TItem> {
  /**
   * Contains all paginations. Both array and sizes match in order.
   */
  paginations: RelayPaginationResult<TItem>;
}

export interface RelayPaginationResult<TItem> {
  /**
   * Array containing all paginations.
   * Order of array: [maxFirst, maxLast, ...after, ...before].
   */
  array: TItem[];
  /**
   * Size of slices for pagination in {@link array}.
   * Order of sizes: [maxFirst, maxLast, ...after, ...before]
   *
   */
  sizes?: [number, number, ...number[]];
}

export default function relayArrayPagination<TItem>(
  input: RelayArrayPaginationInput<TItem>
): PipelineStage.Project['$project'] {
  let maxFirst = -1;
  let maxLast = -1;
  const sliceAfterList: RelayAfterPagination<TItem>[] = [];
  const sliceBeforeList: RelayBeforePagination<TItem>[] = [];
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
        paginations: {
          $reduce: {
            input: [
              maxFirst > 0
                ? {
                    array: { $slice: [`$${input.arrayFieldPath}`, 0, maxFirst] },
                    sizes: null,
                  }
                : emptyPagination,
              maxLast > 0
                ? {
                    array: {
                      $slice: [`$${input.arrayFieldPath}`, -maxLast, maxLast],
                    },
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
                      [{ $size: '$$this.array' }],
                      '$$this.sizes',
                    ],
                  },
                ],
              },
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
        paginations: {
          array: sliceLast(input.arrayFieldPath, limit),
        },
      };
    } else {
      return {
        paginations: {
          array: sliceFirst(input.arrayFieldPath, limit),
        },
      };
    }
  }

  return {
    paginations: {
      array: `$${input.arrayFieldPath}`,
    },
  };
}

export function mapPaginationOutputToInput<TItem>(
  input: RelayArrayPaginationInput<TItem>['paginations'],
  output: RelayArrayPaginationOutput<TItem>['paginations']
): TItem[][] {
  if (!input || input.length === 0) return [output.array];

  const sizes = output.sizes;
  if (!sizes) throw new Error('Expected pagination sizes to be defined');

  let afterIndex = 2;
  let afterSize = sizes[0] + sizes[1];

  let beforeIndex = input.reduce(
    (a, b) => a + (isAfterPagination(b) ? 1 : 0),
    afterIndex
  );
  let beforeSize = sizes
    .slice(afterIndex, beforeIndex)
    .reduce((a, b) => a + b, afterSize);

  return input.map((pagination) => {
    if (isFirstPagination(pagination)) {
      return output.array.slice(0, Math.min(pagination.first, sizes[0]));
    } else if (isLastPagination(pagination)) {
      const end = sizes[0] + sizes[1];
      return output.array.slice(Math.max(sizes[0], end - pagination.last), end);
    } else if (isAfterPagination(pagination)) {
      const nextSize = sizes[afterIndex];
      if (nextSize == null) {
        throw new Error(`Expected size at index ${afterIndex}`);
      }

      const slice = output.array.slice(afterSize, afterSize + nextSize);
      afterSize += nextSize;
      afterIndex++;

      return slice;
    } else {
      const nextSize = sizes[beforeIndex];
      if (nextSize == null) {
        throw new Error(`Expected size at index ${beforeIndex}`);
      }

      const slice = output.array.slice(beforeSize, beforeSize + nextSize);
      beforeSize += nextSize;
      beforeIndex++;

      return slice;
    }
  });
}
