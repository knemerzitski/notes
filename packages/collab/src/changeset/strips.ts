import { rangeRelation } from '../../../utils/src/range-relation';

import { getDefaultStripLength } from './strip-length';

import { Strip, RetainStrip, InsertStrip, DeleteStrip, StripsStruct } from '.';

type SliceOptions = Parameters<Strips['slice']>[2];

function simpleCheckIsCompact(strips: readonly Strip[]) {
  if (strips.length === 1) {
    if (strips[0] instanceof InsertStrip || strips[0] instanceof RetainStrip) {
      return true;
    }
  }

  return false;
}

/**
 * A strip array with convinience methods.
 */
export class Strips {
  static readonly EMPTY: Strips = new (class extends Strips {
    readonly EMPTY = true;
    override get isCompact() {
      return true;
    }
    override isEqual(other: Strips): boolean {
      return other === this;
    }
  })();

  /**
   * Convinience method to create Strips from spread syntax.
   */
  static from: (...values: readonly Strip[]) => Strips = (...values) => {
    return new Strips(values);
  };

  readonly values: readonly Strip[];

  /**
   * Total length of all strips.
   */
  readonly length: number;

  /**
   * Highest index value in strips.
   */
  readonly maxIndex;

  private _isCompact: boolean | null;
  get isCompact() {
    return this._isCompact;
  }

  constructor(values: readonly Strip[] = []) {
    this.values = values;
    this._isCompact = simpleCheckIsCompact(values);
    this.length = this.values.map((strip) => strip.length).reduce((a, b) => a + b, 0);
    this.maxIndex = this.values
      .map((strip) => (strip instanceof RetainStrip ? strip.endIndex : -1))
      .reduce((a, b) => Math.max(a, b), -1);
  }

  /**
   * Returns a section of the strips, slicing strips elements to fit the section.
   * E.g ["ab", "cdefg", "hijklm", "no"].slice(4,9) = ["efg", "hi"]
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues until the end.
   */
  slice(
    start = 0,
    end = this.length,
    options?: {
      getLength: typeof getDefaultStripLength;
    }
  ): Strips {
    const getLength = options?.getLength ?? getDefaultStripLength;

    if (start < 0) {
      start += this.length;
    }
    if (end < 0) {
      end += this.length + 1;
    }
    if (start === end || end < start) return Strips.EMPTY;

    const result: Strip[] = [];
    let pos = 0;
    for (const strip of this.values) {
      const nextPos = pos + getLength(strip);
      // Strip is past start
      if (nextPos > start) {
        const absStart = Math.max(start, pos);
        const absEnd = end ? Math.min(end, nextPos) : nextPos;
        const relStart = absStart - pos;
        const relEnd = absEnd - pos;
        result.push(strip.slice(relStart, relEnd));
      }

      pos = nextPos;
      if (pos >= end) {
        // Next strip will start past end
        break;
      }
    }

    if (result.length === 0) return Strips.EMPTY;

    return this.transferCompact(new Strips(result));
  }

  /**
   * Slices by actual values in RetainStrip.
   * E.g ["a",2-5,"bc",8-14].sliceByRetain(4,9) = [4-5,"bc",8]
   * @param start
   * @param end Exclusive
   */
  sliceByRetain(start = 0, end = start + 1): Strips {
    const result: Strip[] = [];
    let isOverlapping = false;

    for (const strip of this.values) {
      if (strip instanceof RetainStrip) {
        const { overlap, position } = rangeRelation(
          strip.startIndex,
          strip.endIndex + 1,
          start,
          end
        );
        if (overlap) {
          isOverlapping = true;
          result.push(
            new RetainStrip(
              Math.max(start, strip.startIndex),
              Math.min(end - 1, strip.endIndex)
            )
          );
          if (position === 'outside' || position === 'right') {
            break;
          }
        } else {
          if (position === 'right') {
            break;
          }
        }
      } else if (isOverlapping) {
        result.push(strip);
      }
    }

    if (result.length === 0) return Strips.EMPTY;

    return this.transferCompact(new Strips(result));
  }

  /**
   * Shrink from edges
   */
  shrink(left: number, right: number) {
    const start = left;
    const end = this.length - right;

    return this.slice(start, end);
  }

  /**
   * Returns the strip with length of 1 at specified index.
   * @param index The zero-based index of the desired strip.
   * A negative index will count back from the last strip.
   */
  at(index: number, options?: SliceOptions): Strip | undefined {
    if (index < 0) {
      index += this.length;
    }
    const { values } = this.slice(index, index + 1, options);
    if (values.length === 1) {
      return values[0];
    }
    return;
  }

  offset(value: number): Strips {
    return this.transferCompact(
      new Strips(this.values.map((strip) => strip.offset(value)))
    );
  }

  /**
   * @returns Returns a new representation of strips that takes up the least
   * amount of memory.
   */
  compact(): Strips {
    if (this._isCompact) return this;

    const newValues = this.values.reduce<Strip[]>((compactedStrips, strip) => {
      if (strip instanceof DeleteStrip) {
        return compactedStrips;
      }
      if (compactedStrips.length === 0) {
        compactedStrips.push(strip);
      } else {
        const concatStrips = compactedStrips[compactedStrips.length - 1]?.concat(strip);
        if (concatStrips) {
          if (concatStrips.values.length > 1) {
            compactedStrips.push(strip);
          } else if (concatStrips.values[0]) {
            compactedStrips.splice(-1, 1, concatStrips.values[0]);
          }
        }
      }
      return compactedStrips;
    }, []);

    if (
      newValues.length === 0 ||
      (newValues.length === 1 && newValues[0] === Strip.EMPTY)
    ) {
      return Strips.EMPTY;
    }

    const compactStrips = new Strips(newValues);
    compactStrips._isCompact = true;
    return compactStrips;
  }

  /**
   * @returns Indexes are ordered ascending.
   */
  isRetainIndexesOrdered() {
    let prevEndIndex = -1;
    for (const strip of this.values) {
      if (strip instanceof RetainStrip) {
        if (strip.startIndex < prevEndIndex) {
          return false;
        }
        prevEndIndex = strip.endIndex;
      }
    }
    return true;
  }

  isEqual(other: Strips): boolean {
    if (this.values.length !== other.values.length) return false;

    for (let i = 0; i < this.values.length; i++) {
      const strip = this.values[i];
      const otherStrip = other.values[i];
      if (strip !== otherStrip) {
        if (!strip || !otherStrip) return false;
        if (!strip.isEqual(otherStrip)) return false;
      }
    }

    return true;
  }

  isEmpty() {
    return Strips.EMPTY.isEqual(this);
  }

  joinInsertions() {
    return this.values
      .filter(InsertStrip.is)
      .map((strip) => strip.value)
      .join('');
  }

  hasOnlyInsertions() {
    return !this.hasRetainStrips();
  }

  hasRetainStrips() {
    return this.values.some((strip) => strip instanceof RetainStrip);
  }

  private transferCompact(newStrips: Strips) {
    if (!newStrips._isCompact) {
      newStrips._isCompact = this._isCompact;
    }
    return newStrips;
  }

  toString() {
    return `[${this.values.join(', ')}]`;
  }

  serialize() {
    return StripsStruct.createRaw(this);
  }

  static parseValue: (value?: unknown) => Strips = (value) => {
    return StripsStruct.create(value);
  };
}
