/**
 * Consecutive increasing ordered non-repeating array: [4,5,6,7,8,9], [-2,-1,0,1].
 * Invalid arrays: [2,3,3,4,5], [2,3,5], [4,3,2].
 */

import { PipelineStage } from 'mongoose';
import {
  RelayAfterBoundPagination,
  RelayArrayPaginationInput,
  RelayArrayPaginationOutput,
  RelayBeforeBoundPagination,
  RelayPagination,
  isAfterBoundPagination,
  isAfterUnboundPagination,
  isBeforeBoundPagination,
  isBeforeUnboundPagination,
  isFirstPagination,
  isLastPagination,
  sliceFirst,
  sliceLast,
} from './relayArrayPagination';

export default function consecutiveIntArrayPagination(
  input: RelayArrayPaginationInput<number>
): PipelineStage.Project['$project'] {
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
      paginations: {
        $let: {
          vars: {
            firstValue: { $first: `$${arrayField}` },
            lastValue: { $last: `$${arrayField}` },
            size: { $size: `$${input.arrayFieldPath}` },
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
                $reduce: {
                  input: [
                    {
                      $cond: [
                        { $gt: ['$$startBound', 0] },
                        { $slice: [`$${input.arrayFieldPath}`, 0, '$$startBound'] },
                        [],
                      ],
                    },
                    { $slice: [`$${input.arrayFieldPath}`, '$$endBound', '$$size'] },
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
                      $concatArrays: ['$$value.sizes', [{ $size: '$$this' }]],
                    },
                  },
                },
              },
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

export function consecutiveIntArrayMapPaginationOutputToInput<TItem>(
  input: RelayArrayPaginationInput<number>['paginations'],
  output: RelayArrayPaginationOutput<TItem>['paginations'],
  toCursor: (item: TItem) => number
): TItem[][] {
  if (!input || input.length === 0) return [output.array];

  const sizes = output.sizes;
  if (!sizes) throw new Error('Expected pagination sizes to be defined');

  return input.map((pagination) => {
    if (isFirstPagination(pagination)) {
      return output.array.slice(0, Math.min(pagination.first, sizes[0]));
    } else if (isLastPagination(pagination)) {
      const end = sizes[0] + sizes[1];
      return output.array.slice(Math.max(sizes[0], end - pagination.last), end);
    } else if (isAfterUnboundPagination(pagination)) {
      const startCursor = pagination.after + 1;
      const firstEndItem = output.array[sizes[0]];
      if (firstEndItem == null) {
        throw new Error(
          `Expected first size end to contain element at index ${sizes[0]}`
        );
      }
      const start = sizes[0] + startCursor - toCursor(firstEndItem);

      return output.array.slice(start, start + sizes[1]);
    } else if (isBeforeUnboundPagination(pagination)) {
      const endCursor = pagination.before;
      const item0 = output.array[0];
      if (item0 == null) {
        throw new Error(`Expected output array first element to be defined at index 0`);
      }
      const cursor0 = toCursor(item0);

      const end = endCursor - cursor0;

      return output.array.slice(0, end);
    } else {
      let startCursor: number;
      let endCursor: number;
      if (isAfterBoundPagination(pagination)) {
        const { after, first } = pagination;
        startCursor = after + 1;
        endCursor = startCursor + first;
      } else {
        const { before, last } = pagination;
        startCursor = before - last;
        endCursor = before;
      }

      let startSize = 0;
      const result: TItem[] = [];
      for (const size of sizes) {
        const item = output.array[startSize];
        if (item == null) {
          throw new Error(
            `Expected output array first element to be defined at index ${startSize}`
          );
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
  });
}

function calcMaxFirst<TCursor>(paginations: RelayPagination<TCursor>[]) {
  return paginations.reduce(
    (a, b) => (isFirstPagination(b) ? Math.max(a, b.first) : a),
    0
  );
}

function calcMaxLast<TCursor>(paginations: RelayPagination<TCursor>[]) {
  return paginations.reduce((a, b) => (isLastPagination(b) ? Math.max(a, b.last) : a), 0);
}

function calcMinAfterUnbound(paginations: RelayPagination<number>[]) {
  return paginations.reduce(
    (a, b) => (isAfterUnboundPagination(b) ? Math.min(a, b.after) : a),
    Infinity
  );
}

function calcMaxBeforeUnbound(paginations: RelayPagination<number>[]) {
  return paginations.reduce(
    (a, b) => (isBeforeUnboundPagination(b) ? Math.max(a, b.before) : a),
    -Infinity
  );
}

function calcUniqueBoundPaginations(paginations: RelayPagination<number>[]) {
  const uniquePaginations = new BoundPaginationUnion();
  for (const p of paginations) {
    if (isAfterBoundPagination(p) || isBeforeBoundPagination(p)) {
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
  private _slices: RelayAfterBoundPagination<number>[] = [];
  get slices(): Readonly<RelayAfterBoundPagination<number>[]> {
    return this._slices;
  }

  add(range: RelayAfterBoundPagination<number> | RelayBeforeBoundPagination<number>) {
    const { after, first } = isAfterBoundPagination(range)
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
      | Pick<RelayAfterBoundPagination<number>, 'after'>
      | Pick<RelayBeforeBoundPagination<number>, 'before'>
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
