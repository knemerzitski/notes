import { Maybe, PartialBy } from '~utils/types';

import { coerce, Infer, number, object, optional } from 'superstruct';
import { Changeset } from '../changeset';

const ExpandedSelectionRangeStruct = object({
  start: number(),
  end: number(),
});

const CollapsedSelectionRangeStruct = object({
  start: number(),
  end: optional(number()),
});

export const SelectionRangeStruct = coerce(
  ExpandedSelectionRangeStruct,
  CollapsedSelectionRangeStruct,
  (value) => SelectionRange.expandSame(value),
  (value) => SelectionRange.collapseSame(value)
);

export type SelectionRange = Infer<typeof ExpandedSelectionRangeStruct>;

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
  export function from(
    selection?: Readonly<PartialBy<SelectionRange, 'end'>>
  ): SelectionRange;
  export function from(
    selection: Readonly<PartialBy<SelectionRange, 'end'>> | number = 0,
    end?: number
  ): SelectionRange {
    if (typeof selection === 'number') {
      return { start: selection, end: end ?? selection };
    } else {
      return { start: selection.start, end: selection.end ?? selection.start };
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

  /**
   * Removes end if start === end
   */
  export function collapseSame(
    range: PartialBy<SelectionRange, 'end'>
  ): PartialBy<SelectionRange, 'end'> {
    if (range.start === range.end || range.end == null) {
      return {
        start: range.start,
      };
    } else {
      return range;
    }
  }

  /**
   * Ensures SelectionRange has start and end defined
   */
  export function expandSame({
    start,
    end,
  }: {
    start: number;
    end?: Maybe<number>;
  }): SelectionRange {
    if (end == null) {
      return {
        start,
        end: start,
      };
    } else {
      return {
        start,
        end,
      };
    }
  }

  export function closestRetainedPosition(
    { start, end }: Readonly<SelectionRange>,
    changeset: Changeset
  ): SelectionRange {
    if (start === end) {
      const tmp = changeset.indexOfClosestRetained(start);
      start = tmp;
      end = tmp;
    } else {
      start = changeset.indexOfClosestRetained(start);
      end = changeset.indexOfClosestRetained(end);
    }
    return { start, end };
  }

  export function isEqual(a?: Partial<SelectionRange>, b?: Partial<SelectionRange>) {
    if (!a && !b) return true;
    if (a && b) {
      return a.start === b.start && (a.end ?? a.start) === (b.end && b.start);
    }
    return false;
  }

  export function parseValue(value: unknown): SelectionRange {
    return SelectionRangeStruct.create(value);
  }

  export function parseValueMaybe(value: unknown): SelectionRange | undefined {
    if (value === undefined) return value;
    return parseValue(value);
  }
}
