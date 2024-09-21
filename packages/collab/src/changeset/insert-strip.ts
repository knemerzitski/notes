import { Strip, Strips, RetainStrip, InsertStripStruct, ChangesetCreateError } from '.';

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

  static is: (strip: Strip) => strip is InsertStrip = (strip) => {
    return strip instanceof InsertStrip;
  };

  readonly value: string;

  constructor(value: string) {
    super();
    if (value.length === 0) {
      throw new ChangesetCreateError('value cannot be empty');
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
    return InsertStripStruct.createRaw(this);
  }

  static override parseValue: (value: unknown) => InsertStrip = (value) => {
    return InsertStripStruct.create(value);
  };
}
