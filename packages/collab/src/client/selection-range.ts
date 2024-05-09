import { Changeset } from '../changeset/changeset';
import { assertHasProperties, parseNumber } from '~utils/serialize';

export interface SelectionRange {
  /**
   * If start is greater than end, then both are treated as value of end
   */
  start: number;
  end: number;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SelectionRange {
  export const ZERO: Readonly<SelectionRange> = { start: 0, end: 0 };

  export function add(
    a: Readonly<SelectionRange>,
    b: Readonly<SelectionRange>
  ): SelectionRange {
    return { start: a.start + b.start, end: a.end + b.end };
  }

  export function from(start?: number, end?: number): SelectionRange;
  export function from(selection?: Readonly<SelectionRange>): SelectionRange;
  export function from(
    selection: Readonly<SelectionRange> | number = 0,
    end?: number
  ): SelectionRange {
    if (typeof selection === 'number') {
      return { start: selection, end: end ?? selection };
    } else {
      return { start: selection.start, end: selection.end };
    }
  }

  /**
   * Clamp selection between [0,length]. If value is < 0 then value becomes length
   */
  export function clamp(
    { start, end }: Readonly<SelectionRange>,
    length: number
  ): SelectionRange {
    if (start < 0) {
      start = length;
    }
    if (end < 0) {
      end = length;
    }
    if (end < start) {
      start = end;
    }

    start = Math.max(0, Math.min(start, length));
    end = Math.max(0, Math.min(end, length));

    return { start, end };
  }

  export function subtract(
    a: Readonly<SelectionRange>,
    b: Readonly<SelectionRange>
  ): SelectionRange {
    return { start: a.start - b.start, end: a.end - b.end };
  }

  export function followChangeset(
    { start, end }: Readonly<SelectionRange>,
    changeset: Changeset
  ): SelectionRange {
    if (start === end) {
      const tmp = changeset.followIndex(start);
      start = tmp;
      end = tmp;
    } else {
      start = changeset.followIndex(start);
      end = changeset.followIndex(end);
    }
    return { start, end };
  }

  export function parseValue(value: unknown): SelectionRange {
    assertHasProperties(value, ['start']);
    
    const start = parseNumber(value.start);
    return {
      start,
      end: 'end' in value ? parseNumber(value.end) : start,
    };
  }
}
