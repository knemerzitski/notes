import { Strip, Strips, ChangesetCreateError } from '.';

/**
 * Represents a range of characters in a text.
 * RangeStrip is immutable.
 */
export abstract class RangeStrip<T extends RangeStrip<T>> extends Strip {
  readonly startIndex: number;

  /**
   * Is inclusive - character at this index is included.
   */
  readonly endIndex: number;

  /**
   * Length of the strip as in how many characters are kept in text.
   */
  readonly length: number;

  /**
   *
   * @param startIndex Range start index
   * @param endIndex Must be greater or equal to {@link startIndex}. Is inclusive.
   */
  constructor(startIndex: number, endIndex: number = startIndex) {
    super();
    if (startIndex < 0) {
      throw new ChangesetCreateError(
        `"startIndex" must be non-negative (0 <= ${startIndex})`
      );
    }
    if (endIndex < startIndex) {
      throw new ChangesetCreateError(
        `"endIndex" must be greater or equal to startIndex (${startIndex} <= ${endIndex})`
      );
    }

    this.startIndex = startIndex;
    this.endIndex = endIndex;

    this.length = this.endIndex - this.startIndex + 1;
  }

  /**
   * Create a copy of the same class instance
   */
  protected abstract newInstance(startIndex: number, endIndex?: number): T;

  /**
   * @returns Sliced Strips from {@link startIndex} to {@link endIndex} (exclusive)
   */
  reference(strips: Strips): Strips {
    return strips.slice(this.startIndex, this.endIndex + 1);
  }

  /**
   * Returns a section of the strip range.
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues to the end of strip.
   */
  slice(start = 0, end: number): T | typeof Strip.EMPTY {
    if (start < 0 || end <= start) return Strip.EMPTY;

    const newStartIndex = this.startIndex + start;
    if (newStartIndex > this.endIndex) {
      return Strip.EMPTY;
    }

    const newEndIndex = Math.min(this.startIndex + end - 1, this.endIndex);

    return this.newInstance(newStartIndex, newEndIndex);
  }

  concat(other: Strip): Strips {
    if (other === Strip.EMPTY) return Strips.from(this);

    if (
      other instanceof RangeStrip &&
      // Both instances are created from same class
      Object.getPrototypeOf(this) === Object.getPrototypeOf(other) &&
      this.endIndex + 1 === other.startIndex
    ) {
      // E.g. [2,5] + [6,10] = [2,10]
      return Strips.from(this.newInstance(this.startIndex, other.endIndex));
    }

    return new Strips([this, other]);
  }

  offset(offset: number): T | this {
    if (offset === 0) return this;
    return this.newInstance(this.startIndex + offset, this.endIndex + offset);
  }

  /**
   * Strips are equal if both are instances of same class
   * and have same indexes.
   */
  isEqual(other: Strip): boolean {
    return (
      other instanceof RangeStrip &&
      // Both instances are created from same class
      Object.getPrototypeOf(this) === Object.getPrototypeOf(other) &&
      other.startIndex === this.startIndex &&
      other.endIndex === this.endIndex
    );
  }

  toString() {
    return this.startIndex !== this.endIndex
      ? `${this.startIndex} - ${this.endIndex}`
      : String(this.startIndex);
  }
}
