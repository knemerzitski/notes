/**
 * Consecutive increasing ordered non-repeating array: [4,5,6,7,8,9], [-2,-1,0,1].
 * Invalid arrays: [2,3,3,4,5], [2,3,5], [4,3,2].
 */

import { PipelineStage } from 'mongoose';
import {
  RelayAfterBoundPagination,
  RelayArrayPaginationInput,
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
  if (input.paginations) {
    const maxFirst = calcMaxFirst(input.paginations);
    const maxLast = calcMaxLast(input.paginations);
    const minAfterUnbound = calcMinAfterUnbound(input.paginations);
    const maxBeforeUnbound = calcMaxBeforeUnbound(input.paginations);
    const uniqueBoundPaginations = calcUniqueBoundPaginations(input.paginations);

    // TODO if have limit then no unbound...

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

function calcMaxFirst<TItem>(paginations: RelayPagination<TItem>[]) {
  return paginations.reduce(
    (a, b) => (isFirstPagination(b) ? Math.max(a, b.first) : a),
    0
  );
}

function calcMaxLast<TItem>(paginations: RelayPagination<TItem>[]) {
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
