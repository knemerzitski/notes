import { Strip, Strips } from './changeset';

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
    return new Strips(this);
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
      return new Strips(new StringStrip(this.value + other.value));
    }
    return new Strips(this, other);
  }

  serialize(): unknown {
    return this.value;
  }

  toString() {
    return `"${this.value}"`;
  }
}
