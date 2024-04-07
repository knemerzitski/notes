import { PipelineStage } from 'mongoose';

/**
 * From beginning up to first number of results.
 * @param first Must be a positive number > 0
 */
export function sliceFirst(arrayFieldPath: string, first?: number) {
  if (!first) {
    return `$${arrayFieldPath}`;
  }
  return {
    $slice: [`$${arrayFieldPath}`, 0, first],
  };
}

/**
 * From end up to last number of results.
 * @param last Must be a positive number > 0
 */
export function sliceLast(arrayFieldPath: string, last?: number) {
  if (!last) {
    return `$${arrayFieldPath}`;
  }
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
  /**
   * If slice list is empty then whole array is returned.
   */
  sliceList: {
    /**
     * Expression used to search for the element.
     */
    after: TItem;
    /**
     * Size of slice. If not defined then array is sliced to the end.
     */
    first?: number;
  }[];
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
  if (sliceList.length === 0) {
    return `$${arrayFieldPath}`;
  }

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
  /**
   * If slice list is empty then whole array is returned.
   */
  sliceList: {
    /**
     * Expression used to search for the element.
     */
    before: TItem;
    /**
     * Size of slice. If not defined then array is sliced to the start.
     */
    last?: number;
  }[];
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
  if (sliceList.length === 0) {
    return `$${arrayFieldPath}`;
  }

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

export interface RelayPagination<TItem> {
  // TODO allow only one or either at once, but not both
  first?: number | null;
  after?: TItem | null;
  last?: number | null;
  before?: TItem | null;
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
  /**
   * First element value.
   */
  // TODO remove first last element inclusin
  firstElement?: TItem;
  /**
   * First element value.
   */
  lastElement?: TItem;
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

export default function relayArrayPagination<TItem>(
  input: RelayArrayPaginationInput<TItem>
): PipelineStage.Project['$project'] {
  // TODO dont do that here???
  const firstLastElement = {
    firstElement: {
      $first: `$${input.arrayFieldPath}`,
    },
    lastElement: {
      $last: `$${input.arrayFieldPath}`,
    },
  };

  let maxFirst = -1;
  let maxLast = -1;
  const sliceAfterList: SliceAfterInput<TItem>['sliceList'] = [];
  const sliceBeforeList: SliceBeforeInput<TItem>['sliceList'] = [];
  if (input.paginations) {
    for (const pagination of input.paginations) {
      const first = maybeApplyLimit(pagination.first, input.defaultLimit, input.maxLimit);
      if (pagination.after != null) {
        sliceAfterList.push({
          after: pagination.after,
          first,
        });
      } else if (pagination.first != null && first != null) {
        maxFirst = Math.max(maxFirst, first);
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
              sliceAfterList.length > 0
                ? sliceAfter({
                    arrayFieldPath: input.arrayFieldPath,
                    itemPath: input.arrayItemPath,
                    sliceList: sliceAfterList,
                  })
                : skipPagination,
              sliceBeforeList.length > 0
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
        ...firstLastElement,
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
        ...firstLastElement,
      };
    } else {
      return {
        paginations: {
          array: sliceFirst(input.arrayFieldPath, limit),
        },
        ...firstLastElement,
      };
    }
  }
  return {
    paginations: {
      array: `$${input.arrayFieldPath}`,
    },
    ...firstLastElement,
  };
}
