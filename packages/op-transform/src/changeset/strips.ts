import { isInsertStrip } from './insert-strip';
import { RetainStrip } from './retain-strip';
import { Serializable } from './serialize.types';
import { SerializedStrip, Strip } from './strip';

export type SerializedStrips = SerializedStrip[];

/**
 * A strip array with convinience methods.
 */
export class Strips implements Serializable<SerializedStrips> {
  static EMPTY = new Strips();

  /**
   * Convinience method to create Strips from spread syntax.
   */
  static from(...values: Readonly<Strip[]>) {
    return new Strips(values);
  }

  readonly values: Readonly<Strip[]>;

  /**
   * Total length of all strips.
   */
  readonly length: number;

  /**
   * Highest index value in strips.
   */
  readonly maxIndex;

  private isCompact: boolean | null;

  constructor(values: Readonly<Strip[]> = []) {
    this.values = values;
    this.isCompact = values.length <= 1;
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
  slice(start = 0, end?: number): Strips {
    if (start < 0) {
      start = (start % this.length) + this.length;
    }
    if (end && end < 0) {
      end = (end % this.length) + this.length + 1;
    }

    const result: Strip[] = [];
    let pos = 0;
    for (const strip of this.values) {
      const nextPos = pos + strip.length;
      // Strip is past start
      if (nextPos > start) {
        const absStart = Math.max(start, pos);
        const absEnd = end ? Math.min(end, nextPos) : nextPos;
        const relStart = absStart - pos;
        const relEnd = absEnd - pos;
        result.push(strip.slice(relStart, relEnd));
      }

      pos = nextPos;
      if (end && pos >= end) {
        // Next strip will start past end
        break;
      }
    }

    if (result.length === 0) return Strips.EMPTY;

    return new Strips(result);
  }

  /**
   * Returns the strip at specified index.
   * @param index The zero-based index of the desired strip.
   * A negative index will count back from the last strip.
   */
  at(index: number): Strip | undefined {
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
  compact(): Strips {
    if (this.isCompact) return this;

    const newValues = this.values.reduce<Strip[]>((compactedStrips, strip) => {
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

  /**
   * @returns Indices are ordered ascending.
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

  isEqual(other: Readonly<Strips>): boolean {
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

  joinInsertions() {
    return this.values
      .filter(isInsertStrip)
      .map((strip) => strip.value)
      .join('');
  }

  toString() {
    return `[${this.values.join(', ')}]`;
  }

  serialize(): SerializedStrips {
    return this.values.map((strip) => strip.serialize());
  }

  static deserialize(value?: unknown): Strips {
    if (!value) return Strips.EMPTY;

    if (!Array.isArray(value)) {
      throw new Error(
        `'${String(value)}' cannot be deserialized to Strips. Value is not an array.`
      );
    }

    if (value.length === 0) {
      return Strips.EMPTY;
    }

    return new Strips(value.map((v) => Strip.deserialize(v)));
  }
}
