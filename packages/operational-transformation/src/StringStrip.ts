import Strip from './Strip';
import Strips from './Strips';

/**
 * Represents string insertion in the new document.
 */
export default class StringStrip<T extends string = string> implements Strip<T> {
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  get length() {
    return this.value.length;
  }

  get maxIndex() {
    return -1;
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
    return new StringStrip(this.value.slice(start, end));
  }

  /**
   * @returns new StringStrip({@link value} + other.value) if other is StringStrip,
   * otherwise returns both in the same Strips
   *
   */
  concat(other: Strip<T>): Strips<T> {
    if (other instanceof StringStrip) {
      return Strips.from(new StringStrip(this.value + other.value));
    }
    return Strips.from(this, other);
  }

  toPOJO(): unknown {
    return this.value;
  }

  toString() {
    return `"${this.value}"`;
  }
}