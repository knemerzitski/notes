import { DBRevisionRecord } from '../models/collab/embedded/revision-record';
import relayArrayPagination, {
  RelayArrayPaginationInput,
  RelayArrayPaginationOutput,
  maybeApplyLimit,
} from './relayArrayPagination';

export type CollaborativeDocumentRevisionRecordsPaginationInput = Omit<
  RelayArrayPaginationInput<number>,
  'arrayFieldPath' | 'arrayItemPath' | 'searchExpression'
>;

export type CollaborativeDocumentRevisionRecordsPaginationOutput =
  RelayArrayPaginationOutput<DBRevisionRecord>;

export function unionPaginationBeforeAfterRevisions(
  input: Pick<
    CollaborativeDocumentRevisionRecordsPaginationInput,
    'paginations' | 'defaultLimit' | 'maxLimit'
  >
): CollaborativeDocumentRevisionRecordsPaginationInput['paginations'] {
  const paginations = input.paginations;
  if (!paginations) return [];

  const rangeUnion = new AfterRangeUnion();
  let minAfter = Infinity;
  let maxBefore = -Infinity;
  let maxFirst = -1;
  let maxLast = -1;
  for (const pagination of paginations) {
    const { before, after } = pagination;
    let { first, last } = pagination;
    first = maybeApplyLimit(first);
    let hasAnyPaginations = false;
    if (after) {
      if (first) {
        rangeUnion.add({ after, first });
        hasAnyPaginations = true;
      } else {
        minAfter = Math.min(minAfter, after);
        if (minAfter < maxBefore) {
          return [];
        }
        hasAnyPaginations = true;
      }
    } else if (first) {
      maxFirst = Math.max(maxFirst, first);
      hasAnyPaginations = true;
    }

    last = maybeApplyLimit(last);
    if (before) {
      if (last) {
        rangeUnion.add({ before, last });
        hasAnyPaginations = true;
      } else {
        maxBefore = Math.max(maxBefore, before);
        if (minAfter < maxBefore) {
          return [];
        }
        hasAnyPaginations = true;
      }
    } else if (last) {
      maxLast = Math.max(maxLast, last);
      hasAnyPaginations = true;
    }

    if (!hasAnyPaginations) {
      return [];
    }
  }

  const result: CollaborativeDocumentRevisionRecordsPaginationInput['paginations'] = [];

  if (maxFirst != -1) {
    result.push({ first: maxFirst });
  }
  if (maxLast != -1) {
    result.push({ last: maxLast });
  }

  if (minAfter !== Infinity) {
    minAfter = rangeUnion.remove({ after: minAfter });
    result.push({ after: minAfter });
  }
  if (maxBefore !== -Infinity) {
    maxBefore = rangeUnion.remove({ before: maxBefore });
    result.push({ before: maxBefore });
  }

  result.push(...rangeUnion.slices);

  return result;
}

export default function revisionRecordsPagination(
  input: CollaborativeDocumentRevisionRecordsPaginationInput
) {
  return relayArrayPagination<number>({
    arrayFieldPath: 'records',
    arrayItemPath: 'revision',
    ...input,
    paginations: unionPaginationBeforeAfterRevisions(input),
  });
}

export interface AfterRange {
  after: number;
  first: number;
}

export interface BeforeRange {
  before: number;
  last: number;
}

export class AfterRangeUnion {
  private _slices: AfterRange[] = [];
  get slices(): Readonly<AfterRange[]> {
    return this._slices;
  }

  add(range: AfterRange | BeforeRange) {
    const { after, first } =
      'after' in range
        ? { after: range.after, first: range.first }
        : // Changing pagination from before to after might fail if last is too big.
          { after: range.before - range.last - 1, first: range.last };

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
  remove(rangeStart: Pick<AfterRange, 'after'> | Pick<BeforeRange, 'before'>) {
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
