import { RetainStrip } from './retain-strip';
import { Strip } from './strip';
import { Strips } from './strips';

/**
 * Represents string insertion in a text.
 * InsertStrip is immutable.
 */
export class InsertStrip extends Strip {
  static create(value: string): InsertStrip | Strip {
    if (value.length === 0) {
      return Strip.EMPTY;
    }

    return new InsertStrip(value);
  }

  readonly value: string;

  constructor(value: string) {
    super();
    if (value.length === 0) {
      throw new Error('value cannot be empty');
    }
    this.value = value;
  }

  get length() {
    return this.value.length;
  }

  /**
   *
   * @returns Whole string {@link value}
   */
  reference(): Strips {
    return Strips.from(this);
  }

  /**
   * @returns InsertStrip with a sliced value.
   */
  slice(start?: number, end?: number) {
    return InsertStrip.create(this.value.slice(start, end));
  }

  /**
   * @returns InsertStrip with values concatenated.
   *
   */
  concat(other: Strip): Strips {
    if (other === Strip.EMPTY) return Strips.from(this);

    if (other instanceof InsertStrip) {
      // "abc" + "de" = "abcde"
      return Strips.from(InsertStrip.create(this.value + other.value));
    }
    return Strips.from(this, other);
  }

  /**
   * Insert strip as retained strip
   * @param offset Retain index offset
   */
  retain(offset = 0): Strip {
    if (this.length >= 1) {
      return new RetainStrip(offset, offset + this.length - 1);
    }

    // Should never happen as InsertStrip with length < 1 is not allowed by constructor
    return Strip.EMPTY;
  }

  /**
   * Strips are equal if both are InsertStrip with same value or
   * both strips have zero length (empty).
   */
  isEqual(other: Strip): boolean {
    return other instanceof InsertStrip && other.value === this.value;
  }

  toString() {
    return `"${this.value}"`;
  }

  serialize() {
    return this.value;
  }

  static override parseValue(value: unknown) {
    if (typeof value === 'string') {
      return InsertStrip.create(value);
    }
    return Strip.NULL;
  }
}

export function isInsertStrip(strip: Strip): strip is InsertStrip {
  return strip instanceof InsertStrip;
}
