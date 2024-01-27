import { RetainStrip } from './retain-strip';
import { EMPTY, Strip } from './strip';
import { Strips } from './strips';

/**
 * Represents string insertion in the new document.
 */
export class InsertStrip<T extends string = string> implements Strip<T> {
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  get length() {
    return this.value.length;
  }

  /**
   *
   * @returns Whole string {@link value}
   */
  reference(): Strips<T> {
    return Strips.from(this);
  }

  /**
   * @returns new StringStrip({@link value}.slice({@link start}, {@link end}))
   */
  slice(start?: number, end?: number) {
    return new InsertStrip(this.value.slice(start, end));
  }

  /**
   * @returns new StringStrip({@link value} + other.value) if other is StringStrip,
   * otherwise returns both in the same Strips
   *
   */
  concat(other: Strip<T>): Strips<T> {
    if (other instanceof InsertStrip) {
      return Strips.from(new InsertStrip(this.value + other.value));
    }
    return Strips.from(this, other);
  }

  /**
   * Insert strip as retained strip
   * @param offset Retain index offset
   */
  retain(offset = 0): RetainStrip<T> | Strip<never> {
    if (this.length >= 1) {
      return new RetainStrip<T>(offset, offset + this.length - 1);
    }

    return EMPTY;
  }

  toString() {
    return `"${this.value}"`;
  }
}
