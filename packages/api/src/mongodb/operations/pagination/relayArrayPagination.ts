import isNonEmptyArray from '~utils/array/isNonEmptyArray';

export interface RelayFirstPagination {
  after?: never;
  first: number;
}

export interface RelayAfterUnboundPagination<TCursor> {
  after: TCursor;
  first?: never;
}

export interface RelayAfterBoundPagination<TCursor> {
  after: TCursor;
  first: number;
}

export type RelayAfterPagination<TCursor> =
  | RelayAfterUnboundPagination<TCursor>
  | RelayAfterBoundPagination<TCursor>;

export interface RelayLastPagination {
  before?: never;
  last: number;
}

export interface RelayBeforeUnboundPagination<TCursor> {
  before: TCursor;
  last?: never;
}

export interface RelayBeforeBoundPagination<TCursor> {
  before: TCursor;
  last: number;
}

export type RelayBeforePagination<TCursor> =
  | RelayBeforeUnboundPagination<TCursor>
  | RelayBeforeBoundPagination<TCursor>;

export type RelayForwardsPagination<TCursor> =
  | RelayFirstPagination
  | RelayAfterPagination<TCursor>;
export type RelayBackwardsPagination<TCursor> =
  | RelayLastPagination
  | RelayBeforePagination<TCursor>;

export type RelayPagination<TCursor> =
  | RelayForwardsPagination<TCursor>
  | RelayBackwardsPagination<TCursor>;

/**
 * @returns String that is unique for a pagination.
 */
export function getPaginationKey<T>(p: RelayPagination<T>): string {
  if ('after' in p || 'first' in p) {
    return `a${p.after != null ? String(p.after) : ''}:${p.first ?? ''}`;
  } else {
    return `b${p.before != null ? String(p.before) : ''}:${p.last ?? ''}`;
  }
}

export function isFirstPagination<TCursor>(
  pagination: RelayPagination<TCursor>
): pagination is RelayFirstPagination {
  return (
    'first' in pagination &&
    pagination.first != null &&
    (!('after' in pagination) || pagination.after == null)
  );
}

export function isLastPagination<TCursor>(
  pagination: RelayPagination<TCursor>
): pagination is RelayLastPagination {
  return (
    'last' in pagination &&
    pagination.last != null &&
    (!('before' in pagination) || pagination.before == null)
  );
}

export function isAfterPagination<TCursor>(
  pagination: RelayPagination<TCursor>
): pagination is RelayAfterPagination<TCursor> {
  return 'after' in pagination && pagination.after != null;
}

export function isAfterUnboundPagination<TCursor>(
  pagination: RelayPagination<TCursor>
): pagination is RelayAfterUnboundPagination<TCursor> {
  return (
    'after' in pagination &&
    pagination.after != null &&
    (!('first' in pagination) || pagination.first == null)
  );
}

export function isAfterBoundPagination<TCursor>(
  pagination: RelayPagination<TCursor>
): pagination is RelayAfterBoundPagination<TCursor> {
  return (
    'after' in pagination &&
    pagination.after != null &&
    'first' in pagination &&
    pagination.first != null
  );
}

export function isBeforePagination<TCursor>(
  pagination: RelayPagination<TCursor>
): pagination is RelayBeforePagination<TCursor> {
  return 'before' in pagination && pagination.before != null;
}

export function isBeforeUnboundPagination<TCursor>(
  pagination: RelayPagination<TCursor>
): pagination is RelayBeforeUnboundPagination<TCursor> {
  return (
    'before' in pagination &&
    pagination.before != null &&
    (!('last' in pagination) || pagination.last == null)
  );
}

export function isBeforeBoundPagination<TCursor>(
  pagination: RelayPagination<TCursor>
): pagination is RelayBeforeBoundPagination<TCursor> {
  return (
    'before' in pagination &&
    pagination.before != null &&
    'last' in pagination &&
    pagination.last != null
  );
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
    [RelayAfterPagination<TCursor>, ...RelayAfterPagination<TCursor>[]]
  >;
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
    [RelayBeforePagination<TCursor>, ...RelayBeforePagination<TCursor>[]]
  >;
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

export function paginationStringToInt(
  pagination: RelayPagination<string>
): RelayPagination<number> {
  if (isAfterPagination(pagination)) {
    return {
      first: pagination.first,
      after: Number.parseInt(pagination.after),
    };
  } else if (isBeforePagination(pagination)) {
    return {
      before: Number.parseInt(pagination.before),
      last: pagination.last,
    };
  }

  return pagination;
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

export interface RelayArrayPaginationInput<TCursor> {
  arrayFieldPath: string;
  /**
   * Optional path to array value in item. Used to find item in array.
   * If undefined then after value itself is compared again array elements.
   */
  arrayItemPath?: string;
  defaultLimit?: number;
  maxLimit?: number;
  paginations?: RelayPagination<TCursor>[];
  /**
   * How to slice when no arguments are provided.
   * @default "start"
   */
  defaultSlice?: 'start' | 'end';
}

export interface RelayArrayPaginationOutput<TItem> {
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

export default function relayArrayPagination<TCursor>(
  input: RelayArrayPaginationInput<TCursor>
): Document {
  let maxFirst = -1;
  let maxLast = -1;
  const sliceAfterList: RelayAfterPagination<TCursor>[] = [];
  const sliceBeforeList: RelayBeforePagination<TCursor>[] = [];
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
                    [{ $size: '$$this.array' }],
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

export function relayArrayPaginationMapOutputToInput<TCursor, TItem>(
  input: RelayArrayPaginationInput<TCursor>['paginations'],
  output: RelayArrayPaginationOutput<TItem>
): TItem[][] {
  // Output is actual contents of item
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
