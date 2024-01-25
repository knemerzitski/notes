import { IndexStrip } from './index-strip';
import Strip, { EMPTY, StripType } from './strip';
import { Strips } from './strips';

/**
 * Represents retained characters range in the original document.
 */
export class RangeStrip<T = string> implements Strip<T> {
  readonly startIndex: number;

  /**
   * endIndex is inclusive
   */
  readonly endIndex: number;

  readonly length;
  readonly maxIndex;

  /**
   *
   * @param startIndex
   * @param endIndex Must be greater or equal to {@link startIndex}
   */
  constructor(startIndex: number, endIndex: number) {
    this.startIndex = startIndex;
    this.endIndex = endIndex;
    if (this.endIndex <= this.startIndex) {
      throw new Error(
        `endIndex is less or equal to startIndex. Use IndexStrip for a single index`
      );
    }
    this.length = this.endIndex - this.startIndex + 1;
    this.maxIndex = this.endIndex;
  }

  get type() {
    return StripType.Retain;
  }

  /**
   * @returns Sliced Strips from {@link startIndex} to {@link endIndex} (inclusive)
   */
  reference(strips: Strips<T>): Strips<T> {
    return strips.slice(this.startIndex, this.endIndex + 1);
  }

  /**
   * Returns a section of the strip range.
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues to the end of strip.
   */
  slice(start = 0, end = this.length) {
    if (start < 0) {
      start = (start % this.length) + this.length;
    }
    if (end && end < 0) {
      end = (end % this.length) + this.length;
    }

    const newStartIndex = this.startIndex + start;
    if (newStartIndex > this.endIndex) {
      return EMPTY;
    }

    const newEndIndex = Math.min(this.startIndex + end - 1, this.endIndex);
    if (newStartIndex === newEndIndex) {
      return new IndexStrip(newStartIndex);
    }

    return new RangeStrip(newStartIndex, newEndIndex);
  }

  concat(other: Strip<T>): Strips<T> {
    if (other instanceof IndexStrip && this.endIndex + 1 == other.index) {
      // E.g. [2,5] + 6 = [2,6]
      return Strips.from(new RangeStrip(this.startIndex, other.index));
    } else if (other instanceof RangeStrip && this.endIndex + 1 === other.startIndex) {
      // E.g. [2,5] + [6,10] = [2,10]
      return Strips.from(new RangeStrip(this.startIndex, other.endIndex));
    }

    return Strips.from(this, other);
  }

  intersect(other: Strip<T>): Strip<T> {
    if (other instanceof RangeStrip) {
      if (this.endIndex >= other.startIndex && other.endIndex >= this.startIndex) {
        return new RangeStrip(
          Math.max(this.startIndex, other.startIndex),
          Math.min(this.endIndex, other.endIndex)
        );
      }
    } else if (other instanceof IndexStrip) {
      if (this.startIndex <= other.index && other.index <= this.endIndex) {
        return other;
      }
    }

    return EMPTY;
  }

  toString() {
    return `${this.startIndex} - ${this.endIndex}`;
  }
}
