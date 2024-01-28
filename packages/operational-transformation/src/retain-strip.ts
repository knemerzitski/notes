import { EMPTY, Strip } from './strip';
import { Strips } from './strips';

/**
 * Represents retained characters range in the original document.
 */
export class RetainStrip<T = string> implements Strip<T> {
  readonly startIndex: number;

  /**
   * endIndex is inclusive
   */
  readonly endIndex: number;

  readonly length;

  /**
   *
   * @param startIndex
   * @param endIndex Must be greater or equal to {@link startIndex}. Is inclusive
   */
  constructor(startIndex: number, endIndex: number = startIndex) {
    this.startIndex = startIndex;
    this.endIndex = endIndex;
    if (this.endIndex < this.startIndex) {
      throw new Error(
        `endIndex must be greater or equal to startIndex (${startIndex} <= ${endIndex})`
      );
    }
    this.length = this.endIndex - this.startIndex + 1;
  }

  /**
   * @returns Sliced Strips from {@link startIndex} to {@link endIndex} (inclusive)
   */
  reference(strips: Readonly<Strips<T>>): Strips<T> {
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

    if (end <= start) return EMPTY;

    const newStartIndex = this.startIndex + start;
    if (newStartIndex > this.endIndex) {
      return EMPTY;
    }

    const newEndIndex = Math.min(this.startIndex + end - 1, this.endIndex);

    return new RetainStrip(newStartIndex, newEndIndex);
  }

  concat(other: Strip<T>): Strips<T> {
    // TODO test emptry returns this
    if (other === EMPTY) return Strips.from(this);

    if (other instanceof RetainStrip && this.endIndex + 1 === other.startIndex) {
      // E.g. [2,5] + [6,10] = [2,10]
      return Strips.from(new RetainStrip(this.startIndex, other.endIndex));
    }

    return new Strips([this, other]);
  }

  offset(offset: number): Strip<T> {
    return new RetainStrip<T>(this.startIndex + offset, this.endIndex + offset);
  }

  isEqual(other: Strip<T>): boolean {
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
}
