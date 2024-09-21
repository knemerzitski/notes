import { Strip, Strips, RetainStripStruct, ChangesetCreateError } from '.';

/**
 * Represents retained characters range in a text.
 * RetainStrip is immutable.
 */
export class RetainStrip extends Strip {
  static create: (startIndex: number, endIndex: number) => RetainStrip | Strip = (
    startIndex,
    endIndex
  ) => {
    if (endIndex < startIndex || endIndex < 0) {
      return Strip.EMPTY;
    }

    startIndex = Math.max(startIndex, 0);
    endIndex = Math.max(startIndex, endIndex);

    return new RetainStrip(startIndex, endIndex);
  };

  static is: (strip: Strip) => strip is RetainStrip = (strip) => {
    return strip instanceof RetainStrip;
  };

  readonly startIndex: number;

  /**
   * Is inclusive - this index is included in retain strip.
   */
  readonly endIndex: number;

  /**
   * Length of the strip as in how many characters are retained.
   */
  readonly length: number;

  /**
   *
   * @param startIndex Start index of retained strip
   * @param endIndex Must be greater or equal to {@link startIndex}. Is inclusive
   */
  constructor(startIndex: number, endIndex: number = startIndex) {
    super();
    if (startIndex < 0) {
      throw new ChangesetCreateError(
        `startIndex must be non-negative (0 <= ${startIndex})`
      );
    }
    if (endIndex < startIndex) {
      throw new ChangesetCreateError(
        `endIndex must be greater or equal to startIndex (${startIndex} <= ${endIndex})`
      );
    }

    this.startIndex = startIndex;
    this.endIndex = endIndex;

    this.length = this.endIndex - this.startIndex + 1;
  }

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
  slice(start = 0, end = this.length) {
    if (start < 0) {
      start = (start % this.length) + this.length;
    }
    if (end && end < 0) {
      end = (end % this.length) + this.length;
    }

    if (end <= start) return Strip.EMPTY;

    const newStartIndex = this.startIndex + start;
    if (newStartIndex > this.endIndex) {
      return Strip.EMPTY;
    }

    const newEndIndex = Math.min(this.startIndex + end - 1, this.endIndex);

    return new RetainStrip(newStartIndex, newEndIndex);
  }

  concat(other: Strip): Strips {
    if (other === Strip.EMPTY) return Strips.from(this);

    if (other instanceof RetainStrip && this.endIndex + 1 === other.startIndex) {
      // E.g. [2,5] + [6,10] = [2,10]
      return Strips.from(new RetainStrip(this.startIndex, other.endIndex));
    }

    return new Strips([this, other]);
  }

  offset(offset: number): Strip {
    if (offset === 0) return this;
    return new RetainStrip(this.startIndex + offset, this.endIndex + offset);
  }

  /**
   * Strips are equal is both are RetainStrip with same indexes or
   * both strips have zero length (empty).
   */
  isEqual(other: Strip): boolean {
    return (
      other instanceof RetainStrip &&
      other.startIndex === this.startIndex &&
      other.endIndex === this.endIndex
    );
  }

  toString() {
    return this.startIndex !== this.endIndex
      ? `${this.startIndex} - ${this.endIndex}`
      : String(this.startIndex);
  }

  serialize() {
    return RetainStripStruct.createRaw(this);
  }

  static override parseValue: (value: unknown) => RetainStrip = (value) => {
    return RetainStripStruct.create(value);
  };
}
