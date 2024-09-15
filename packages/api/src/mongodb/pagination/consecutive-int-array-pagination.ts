import { Document } from 'mongodb';

import {
  CursorArrayPaginationInput,
  CursorArrayPaginationAggregateResult,
  sliceFirst,
  sliceLast,
} from './cursor-array-pagination';
import { STRUCT_NUMBER } from '../constants';
import {
  CursorFirstPagination,
  CursorLastPagination,
  CursorAfterUnboundPagination,
  CursorBeforeUnboundPagination,
  CursorAfterBoundPagination,
  CursorBeforeBoundPagination,
  CursorPagination,
} from './cursor-struct';

/**
 * Consecutive increasing ordered non-repeating array: [4,5,6,7,8,9], [-2,-1,0,1].
 * Invalid arrays: [2,3,3,4,5], [2,3,5], [4,3,2].
 */
export function consecutiveIntArrayPagination(
  input: CursorArrayPaginationInput<number>
): Document {
  if (input.paginations && input.paginations.length > 0) {
    const limitedPaginations =
      input.defaultLimit != null || input.maxLimit != null
        ? input.paginations.map((p) => {
            if ('first' in p && p.first != null) {
              const pCpy = { ...p };
              pCpy.first =
                input.maxLimit != null ? Math.min(p.first, input.maxLimit) : p.first;
              return pCpy;
            } else if ('last' in p && p.last != null) {
              const pCpy = { ...p };
              pCpy.last =
                input.maxLimit != null ? Math.min(p.last, input.maxLimit) : p.last;
              return pCpy;
            }

            return p;
          })
        : input.paginations;

    const maxFirst = calcMaxFirst(limitedPaginations);
    const maxLast = calcMaxLast(limitedPaginations);
    const minAfterUnbound = calcMinAfterUnbound(limitedPaginations);
    const maxBeforeUnbound = calcMaxBeforeUnbound(limitedPaginations);
    const uniqueBoundPaginations = calcUniqueBoundPaginations(limitedPaginations);

    const arrayField = input.arrayItemPath
      ? `${input.arrayFieldPath}.${input.arrayItemPath}`
      : input.arrayFieldPath;

    return {
      $let: {
        vars: {
          firstValue: { $first: `$${arrayField}` },
          lastValue: { $last: `$${arrayField}` },
          size: { $size: { $ifNull: [`$${input.arrayFieldPath}`, []] } },
        },
        in: {
          $let: {
            vars: {
              // Index of array where all elements to left are included (exclusive)
              startBound: {
                $max: [
                  maxFirst,
                  maxBeforeUnbound !== -Infinity
                    ? { $subtract: [maxBeforeUnbound, '$$firstValue'] }
                    : null,
                ],
              },
              // Index of array where all elements to left are included (inclusive)
              endBound: {
                $min: [
                  { $subtract: ['$$size', maxLast] },
                  minAfterUnbound != Infinity
                    ? { $subtract: [minAfterUnbound + 1, '$$firstValue'] }
                    : null,
                ],
              },
            },
            in: {
              $cond: [
                { $lte: ['$$endBound', '$$startBound'] },
                {
                  array: { $ifNull: [`$${input.arrayFieldPath}`, []] },
                },
                {
                  $reduce: {
                    input: [
                      {
                        $cond: [
                          { $gt: ['$$startBound', 0] },
                          { $slice: [`$${input.arrayFieldPath}`, 0, '$$startBound'] },
                          [],
                        ],
                      },
                      {
                        $slice: [`$${input.arrayFieldPath}`, '$$endBound', '$$size'],
                      },
                      ...uniqueBoundPaginations.map(({ after, first }) => ({
                        $let: {
                          vars: {
                            // Start of slice
                            start: {
                              $min: [
                                {
                                  $max: [
                                    0,
                                    {
                                      $subtract: [after + 1, '$$firstValue'],
                                    },
                                    '$$startBound',
                                  ],
                                },
                                '$$endBound',
                              ],
                            },
                            // End of slice
                            end: {
                              $min: [
                                {
                                  $max: [
                                    {
                                      $subtract: [after + first + 1, '$$firstValue'],
                                    },
                                    '$$startBound',
                                  ],
                                },
                                '$$endBound',
                              ],
                            },
                          },
                          in: {
                            $cond: [
                              {
                                $and: [
                                  { $lt: [0, '$$end'] },
                                  { $lt: ['$$start', '$$end'] },
                                ],
                              },
                              {
                                $slice: [
                                  `$${input.arrayFieldPath}`,
                                  '$$start',
                                  { $subtract: ['$$end', '$$start'] },
                                ],
                              },
                              [],
                            ],
                          },
                        },
                      })),
                    ],
                    initialValue: {
                      array: [],
                      sizes: [],
                    },
                    in: {
                      array: {
                        $concatArrays: ['$$value.array', '$$this'],
                      },
                      sizes: {
                        $concatArrays: [
                          '$$value.sizes',
                          [{ $size: { $ifNull: ['$$this', []] } }],
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };
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

interface Range {
  start: number;
  end: number;
}

function getRangeIntersection(a: Range, b: Range) {
  const min = a.start < b.start ? a : b;
  const max = min === a ? b : a;

  if (min.end < max.start) {
    return;
  }

  return {
    start: max.start,
    end: min.end < max.end ? min.end : max.end,
  };
}

export function consecutiveIntArrayPaginationMapAggregateResult<TItem>(
  pagination: NonNullable<CursorArrayPaginationInput<number>['paginations']>[0],
  output: CursorArrayPaginationAggregateResult<TItem>,
  toCursor: (item: TItem) => number
): TItem[] {
  const sizes = output.sizes;

  if (CursorFirstPagination.is(pagination)) {
    const end = sizes ? sizes[0] : output.array.length;
    return output.array.slice(0, Math.min(pagination.first, end));
  } else if (CursorLastPagination.is(pagination)) {
    const start = sizes ? sizes[0] : 0;
    const end = sizes ? sizes[0] + sizes[1] : output.array.length;
    return output.array.slice(Math.max(start, end - pagination.last), end);
  } else if (CursorAfterUnboundPagination(STRUCT_NUMBER).is(pagination)) {
    const startCursor = pagination.after + 1;
    const startSize = sizes?.[0] ?? 0;
    const firstEndItem = output.array[startSize];
    if (firstEndItem == null) {
      return [];
    }
    const start = Math.max(0, startSize + startCursor - toCursor(firstEndItem));
    const end = sizes ? start + sizes[1] : output.array.length;

    return output.array.slice(start, end);
  } else if (CursorBeforeUnboundPagination(STRUCT_NUMBER).is(pagination)) {
    const endCursor = pagination.before;
    const item0 = output.array[0];
    if (item0 == null) {
      return [];
    }
    const cursor0 = toCursor(item0);

    const end = endCursor - cursor0;

    return output.array.slice(0, end);
  } else {
    let startCursor = 0;
    let endCursor = 0;
    if (CursorAfterBoundPagination(STRUCT_NUMBER).is(pagination)) {
      const { after, first } = pagination;
      startCursor = after + 1;
      endCursor = startCursor + first;
    } else if (CursorBeforeBoundPagination(STRUCT_NUMBER).is(pagination)) {
      const { before, last } = pagination;
      startCursor = before - last;
      endCursor = before;
    }

    let startSize = 0;
    const result: TItem[] = [];
    for (const size of sizes ?? [output.array.length]) {
      const item = output.array[startSize];
      if (item == null) {
        return [];
      }

      const startSubCursor = toCursor(item);
      const endSubCursor = startSubCursor + size;

      const range = { start: startCursor, end: endCursor - 1 };
      const subRange = {
        start: startSubCursor,
        end: endSubCursor - 1,
      };
      const intersect = getRangeIntersection(range, subRange);

      if (intersect) {
        const offset = startSize - startSubCursor;
        const outputIndex = {
          start: intersect.start + offset,
          end: intersect.end + 1 + offset,
        };

        result.push(...output.array.slice(outputIndex.start, outputIndex.end));
      }

      startSize += size;
      if (startSize >= output.array.length) break;
    }

    return result;
  }
}

function calcMaxFirst<TCursor>(paginations: CursorPagination<TCursor>[]) {
  return paginations.reduce(
    (a, b) => (CursorFirstPagination.is(b) ? Math.max(a, b.first) : a),
    0
  );
}

function calcMaxLast<TCursor>(paginations: CursorPagination<TCursor>[]) {
  return paginations.reduce(
    (a, b) => (CursorLastPagination.is(b) ? Math.max(a, b.last) : a),
    0
  );
}

function calcMinAfterUnbound(paginations: CursorPagination<number>[]) {
  return paginations.reduce(
    (a, b) =>
      CursorAfterUnboundPagination(STRUCT_NUMBER).is(b) ? Math.min(a, b.after) : a,
    Infinity
  );
}

function calcMaxBeforeUnbound(paginations: CursorPagination<number>[]) {
  return paginations.reduce(
    (a, b) =>
      CursorBeforeUnboundPagination(STRUCT_NUMBER).is(b) ? Math.max(a, b.before) : a,
    -Infinity
  );
}

function calcUniqueBoundPaginations(paginations: CursorPagination<number>[]) {
  const uniquePaginations = new BoundPaginationUnion();
  for (const p of paginations) {
    if (
      CursorAfterBoundPagination(STRUCT_NUMBER).is(p) ||
      CursorBeforeBoundPagination(STRUCT_NUMBER).is(p)
    ) {
      uniquePaginations.add(p);
    }
  }
  return uniquePaginations.slices;
}

/**
 * Removes duplicate and merges repeating pagination ranges.
 * Also orders paginations in ascending order.
 */
export class BoundPaginationUnion {
  private _slices: CursorAfterBoundPagination<number>[] = [];
  get slices(): readonly CursorAfterBoundPagination<number>[] {
    return this._slices;
  }

  add(range: CursorAfterBoundPagination<number> | CursorBeforeBoundPagination<number>) {
    const { after, first } = CursorAfterBoundPagination(STRUCT_NUMBER).is(range)
      ? { after: range.after, first: range.first }
      : { after: range.before - range.last - 1, first: range.last };

    for (let i = 0; i < this._slices.length; i++) {
      const item = this._slices[i];
      if (!item) continue;

      if (after + first < item.after) {
        this._slices.splice(i, 0, { after, first });
        return;
      } else if (after <= item.after && item.after + item.first <= after + first) {
        this._slices.splice(i--);
      } else if (item.after <= after && after + first <= item.after + item.first) {
        return;
      } else if (after < item.after && after + first <= item.after + item.first) {
        item.first = item.after + item.first - after;
        item.after = after;
        return;
      }
    }

    this._slices.push({ after, first });
  }

  /**
   * @returns New after or before value.
   */
  remove(
    rangeStart:
      | Pick<CursorAfterBoundPagination<number>, 'after'>
      | Pick<CursorBeforeBoundPagination<number>, 'before'>
  ) {
    if ('after' in rangeStart) {
      const { after } = rangeStart;

      for (let i = 0; i < this._slices.length; i++) {
        const item = this._slices[i];
        if (!item) continue;

        if (after <= item.after) {
          this._slices = this._slices.slice(0, i);
          return after;
        } else if (after <= item.after + item.first) {
          this._slices = this._slices.slice(0, i);
          return item.after;
        }
      }
      return after;
    } else {
      const { before } = rangeStart;

      for (let i = this.slices.length - 1; i >= 0; i--) {
        const item = this._slices[i];
        if (!item) continue;

        if (item.after + item.first <= before) {
          this._slices = this._slices.slice(i + 1);
          return before;
        } else if (item.after <= before) {
          this._slices = this._slices.slice(i + 1);
          return item.after + item.first + 1;
        }
      }
      return before;
    }
  }
}
