import { Changeset, Strip } from '..';

export interface RangeStripFactory<T> {
  newInstance(start: number, end?: number): T;
  getEmpty(): T;
}

/**
 * Represents a range of characters in a text.
 * RangeStrip is immutable.
 */
export abstract class RangeStrip<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends RangeStrip<T> = RangeStrip<any>,
> extends Strip {
  static override is: (strip: unknown) => strip is RangeStrip = (strip) => {
    return strip instanceof RangeStrip;
  };

  readonly length: number;

  get inputLength() {
    return this.end;
  }

  /**
   * @param start Range start index
   * @param end Must be greator or equal to {@link start}. Is exclusive
   */
  protected constructor(
    protected readonly factory: RangeStripFactory<T>,
    /**
     * The start index to the beginning.
     */
    readonly start: number,
    /**
     * The index to the end. Is exclusive - end index is not included.
     */
    readonly end = start + 1
  ) {
    super();

    this.length = this.end - this.start;
  }

  override concat(other: Strip): Strip | [Strip, Strip] {
    if (
      RangeStrip.is(other) &&
      // Both instances are created from same class
      Object.getPrototypeOf(this) === Object.getPrototypeOf(other) &&
      this.end === other.start
    ) {
      // E.g. [2,5) + [5,10) = [2,10)
      return this.factory.newInstance(this.start, other.end);
    }

    return super.concat(other);
  }

  override toString() {
    if (this.length > 1) {
      return `${this.start} - ${this.end - 1}`;
    } else if (this.length === 1) {
      return String(this.start);
    }

    return super.toString();
  }

  create(start: number, end?: number): T {
    return this.factory.newInstance(start, end);
  }

  /**
   * @returns Sliced Strips from {@link start} to {@link end} (exclusive)
   */
  reference(changeset: Changeset): readonly Strip[] {
    return changeset.sliceText(this.start, this.end);
  }

  /**
   * Returns a section of the strip range.
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues to the end of strip.
   */
  slice(start = 0, end = this.length): T {
    if (start < 0 || end <= start) return this.factory.getEmpty();

    const newStart = this.start + start;
    if (newStart >= this.end) {
      return this.factory.getEmpty();
    }

    const newEnd = Math.min(this.start + end, this.end);

    return this.factory.newInstance(newStart, newEnd);
  }

  /**
   * Strips are equal if both are instances of same class
   * and have same indexes.
   */
  isEqual(other: Strip): boolean {
    return (
      RangeStrip.is(other) &&
      // Both instances are created from same class
      Object.getPrototypeOf(this) === Object.getPrototypeOf(other) &&
      other.start === this.start &&
      other.end === this.end
    );
  }

  isEmpty(): boolean {
    return this.start === this.end;
  }
}
