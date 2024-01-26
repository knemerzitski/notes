import Strip from './strip';

/**
 * A strip array with convinience methods.
 */
export class Strips<T = string> {
  static EMPTY = new Strips<never>();

  /**
   * Convinience method to create Strips from spread syntax.
   */
  static from<U>(...values: Readonly<Strip<U>[]>) {
    return new Strips<U>(values);
  }

  readonly values: Readonly<Strip<T>[]>;

  private _length = -1;
  /**
   * Total length of all strips. Is memoized.
   */
  get length() {
    if (this._length === -1) {
      this._length = this.values.map((strip) => strip.length).reduce((a, b) => a + b, 0);
    }
    return this._length;
  }

  private _maxIndex = -1;
  /**
   * Highest index value in strips. Is memoized.
   */
  get maxIndex() {
    if (this._maxIndex === -1) {
      this._maxIndex = this.values
        .map((strip) => strip.maxIndex)
        .reduce((a, b) => Math.max(a, b), -1);
    }
    return this._maxIndex;
  }

  private isCompact;

  constructor(values: Readonly<Strip<T>[]> = []) {
    this.values = values;
    this.isCompact = values.length <= 1;
  }

  /**
   * Returns a section of the strips, slicing strips elements to fit the section.
   * E.g ["ab", "cdefg", "hijklm", "no"].slice(4,9) = ["efg", "hi"]
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues to the end of char.
   */
  slice(start = 0, end?: number): Strips<T> {
    if (start < 0) {
      start = (start % this.length) + this.length;
    }
    if (end && end < 0) {
      end = (end % this.length) + this.length + 1;
    }

    const result: Strip<T>[] = [];
    let pos = 0;
    for (const strip of this.values) {
      const nextPos = pos + strip.length;
      // strip is past start
      if (nextPos > start) {
        const absStart = Math.max(start, pos);
        const absEnd = end ? Math.min(end, nextPos) : nextPos;
        const relStart = absStart - pos;
        const relEnd = absEnd - pos;
        result.push(strip.slice(relStart, relEnd));
      }

      pos = nextPos;
      if (end && pos >= end) {
        // next strip will start past end
        break;
      }
    }

    return new Strips(result);
  }

  /**
   * Returns the strip at specified index.
   * @param index The zero-based index of the desired strip.
   * A negative index will count back from the last strip.
   */
  at(index: number): Strip<T> | undefined {
    const { values } = this.slice(index, index + 1);
    if (values.length === 1) {
      return values[0];
    }
    return;
  }

  /**
   * @returns Returns a new representation of strips that takes up the least
   * amount of memory.
   */
  compact(): Strips<T> {
    if (this.isCompact) return this;

    const newValues = this.values.reduce<Strip<T>[]>((compactedStrips, strip) => {
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

    const compactStrips = new Strips(newValues);
    compactStrips.isCompact = true;
    return compactStrips;
  }

  toString() {
    return `[${this.values.join(', ')}]`;
  }
}
