import Strip from './Strip';

/**
 * A strip array with convinience methods.
 */
export default class Strips<T = string> {
  static EMPTY = new Strips<never>();

  readonly values: Readonly<Strip<T>[]>;

  constructor(...values: Readonly<Strip<T>[]>) {
    this.values = values;
  }

  /**
   * Returns section of the Chars, slicing Char elements to fit the section.
   * E.g ["ab", "cdefg", "hijklm", "no"].slice(4,9) = ["efg", "hi"]
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues to the end of char.
   * Must be Non-negative value.
   */
  slice(start = 0, end?: number): Strips<T> {
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

    return new Strips(...result);
  }

  /**
   * Returns the strip singular value located at the specified index.
   * @param index The zero-based non-negative index of the desired code unit.
   */
  at(index: number): Strip<T> | undefined {
    const { values } = this.slice(index, index + 1);
    if (values.length === 1) {
      return values[0];
    }
    return;
  }

  calcMaxIndex(): number {
    return this.values
      .map((strip) => strip.maxIndex)
      .reduce((a, b) => Math.max(a, b), -1);
  }

  calcTotalLength(): number {
    return this.values.map((strip) => strip.length).reduce((a, b) => a + b, 0);
  }

  /**
   * @returns Returns a new representation of strips that takes up the least
   * amount of memory.
   */
  compact(): Strips<T> {
    if (this.values.length <= 1) return this;

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

    return new Strips(...newValues);
  }

  /**
   * Create strips from primitives
   * string => StringStrip
   * number => IndexStrip
   * [number,number] => RangeStrip
   */
  static deserialize(...arr: unknown[]): Strips {
    return new Strips(...arr.map((value) => Strip.deserialize(value)));
  }

  serialize() {
    return this.values.map((strip) => strip.serialize());
  }

  toString() {
    return this.values.join(', ');
  }
}
