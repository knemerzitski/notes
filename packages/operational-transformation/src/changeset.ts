import IndexStrip from './IndexStrip';
import RangeStrip from './RangeStrip';
import StringStrip from './StringStrip';

export class ChangesetError extends Error {}

/**
 * Generic representation of a continious range of objects for changesets.
 */
export abstract class Strip<T = string> {
  static EMPTY: Strip<never> = {
    length: 0,
    maxIndex: -1,
    reference() {
      return Strips.EMPTY;
    },
    slice() {
      return this;
    },
    concat<U>(strip: Strip<U>) {
      return new Strips<U>(strip);
    },
    serialize() {
      return;
    },
  };

  abstract length: number;
  /**
   * Max index that this Char can reference.
   * -1 if Char uses no references.
   */
  abstract maxIndex: number;

  /**
   * Returns strips that references values from a {@link strips}
   */
  abstract reference: (strips: Strips<T>) => Strips<T>;

  /**
   * Returns a section of the strip.
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues to the end of strip.
   */
  abstract slice: (start?: number, end?: number) => Strip<T>;

  /**
   * Add together both strips. Effect of both strips is retained and represented in returned value.
   */
  abstract concat: (strip: Strip<T>) => Strips<T>;

  /**
   * Create strip from primitives
   * string => StringStrip
   * number => IndexStrip
   * [number,number] => RangeStrip
   */
  static deserialize(value: unknown) {
    console.log(value);
    if (typeof value === 'string') {
      return new StringStrip(value);
    } else if (typeof value === 'number') {
      return new IndexStrip(value);
    } else if (
      Array.isArray(value) &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number'
    ) {
      return new RangeStrip(value[0], value[1]);
    } else if (value == null) {
      return Strip.EMPTY;
    }

    throw new ChangesetError(`Unable to deserialize ${String(value)} as a Strip`);
  }

  abstract serialize(): unknown;
}

/**
 * A strip array with convinience methods.
 */
export class Strips<T = string> {
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

interface ChangesetOptions<T = string> {
  beforeLen?: number;
  afterLen?: number;
  strips: Strips<T>;
}

/**
 * Represents a change to a document.
 */
export class Changeset<T = string> {
  readonly beforeLen: number;
  readonly afterLen: number;
  readonly strips: Strips<T>;

  constructor(options: ChangesetOptions<T>) {
    this.strips = options.strips;
    this.beforeLen = options.beforeLen ?? options.strips.calcMaxIndex() + 1;
    this.afterLen = options.afterLen ?? options.strips.calcTotalLength();
  }

  /**
   * Returns section of the Changeset as Chars
   * Negative {@link start}, {@link end} starts from end of array.
   * from the end of the array. E.g. -1 is the last element.
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues to the end of char.
   */
  slice(start = 0, end?: number): Strips<T> {
    if (start < 0) {
      start = (start % this.afterLen) + this.afterLen;
    }
    if (end && end < 0) {
      end = (end % this.afterLen) + this.afterLen + 1;
    }
    return this.strips.slice(start, end);
  }

  /**
   * Returns the strip singular value located at the specified index.
   * @param index The zero-based index of the desired code unit. A negative index will count back from the last strip.
   */
  at(index: number): Strip<T> | undefined {
    const { values } = this.slice(index, index + 1);
    if (values.length === 1) {
      return values[0];
    }
    return;
  }

  static deserialize(value: unknown) {
    if (
      Array.isArray(value) &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number' &&
      Array.isArray(value[2])
    ) {
      return new Changeset({
        beforeLen: value[0],
        afterLen: value[1],
        strips: Strips.deserialize(value[2]),
      });
    }

    throw new ChangesetError(`Unable to deserialize ${String(value)} as a Changeset`);
  }

  serialize() {
    return [this.beforeLen, this.afterLen, this.strips.serialize()];
  }

  toString() {
    return `(${this.beforeLen} -> ${this.afterLen})[${String(this.strips)}]`;
  }
}
