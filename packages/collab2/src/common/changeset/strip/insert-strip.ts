/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Strip, InsertStripStruct, Changeset } from '..';

const stickyLeftSymbol = Symbol('stickyPolicy');

/**
 * Represents string insertion.
 * InsertStrip is immutable.
 */
export class InsertStrip extends Strip {
  static setStickyPolicy(strip: InsertStrip, left: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (strip as any)[stickyLeftSymbol] = left;
  }

  static getStickyPolicy(strip: InsertStrip): boolean | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    return (strip as any)[stickyLeftSymbol];
  }

  static readonly EMPTY: InsertStrip = new InsertStrip('');

  static create: (value: string) => InsertStrip = (value: string) => {
    if (value.length === 0) {
      return InsertStrip.EMPTY;
    }

    return new InsertStrip(value);
  };

  static override is: (strip: unknown) => strip is InsertStrip = (strip) => {
    return strip instanceof InsertStrip;
  };

  readonly inputLength = 0;

  get outputLength() {
    return this.value.length;
  }

  get length() {
    return this.value.length;
  }

  protected constructor(readonly value: string) {
    super();
  }

  /**
   * @returns InsertStrip with values concatenated.
   *
   */
  override concat(other: Strip): Strip | [Strip, Strip] {
    if (InsertStrip.is(other)) {
      if (
        InsertStrip.is(other) &&
        Object.getPrototypeOf(this) === Object.getPrototypeOf(other)
      ) {
        // "abc" + "de" = "abcde"
        return InsertStrip.create(this.value + other.value);
      }
    }

    return super.concat(other);
  }

  override toString() {
    if (this.value.length > 0) {
      return JSON.stringify(this.value);
    }

    return `${super.toString()}""`;
  }

  /**
   *
   * @returns Whole string {@link value}
   */
  reference(_changeset: Changeset): readonly Strip[] {
    return [this];
  }

  /**
   * @returns InsertStrip with a sliced value.
   */
  slice(start: number, end: number): Strip {
    return InsertStrip.create(this.value.slice(start, end));
  }

  /**
   * Strips are equal if both are InsertStrip with same value or
   * both strips have zero length (empty).
   */
  isEqual(other: Strip): boolean {
    return (
      InsertStrip.is(other) &&
      Object.getPrototypeOf(this) === Object.getPrototypeOf(other) &&
      this.value === other.value
    );
  }

  isEmpty(): boolean {
    return this.value === '';
  }

  serialize(): unknown {
    return InsertStripStruct.createRaw(this);
  }
}
