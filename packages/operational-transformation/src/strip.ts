import { Strips } from './strips';

/**
 * Strip represents a range of similar properties in a changeset.
 */
export abstract class Strip {
  static EMPTY: Strip = {
    length: 0,

    reference() {
      return Strips.EMPTY;
    },
    slice() {
      return this;
    },
    concat(strip: Strip) {
      return Strips.from(strip);
    },
    isEqual(strip: Strip): boolean {
      return strip === Strip.EMPTY;
    },
    toString() {
      return '(EMPTY)';
    },
  };

  abstract length: number;

  /**
   * Returns strips that references values from a {@link strips}
   */
  abstract reference(strips: Readonly<Strips>): Strips;

  /**
   * Returns a section of the strip.
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues to the end of strip.
   */
  abstract slice(start?: number, end?: number): Strip;

  /**
   * Add together both strips. Effect of both strips is retained and represented in returned value.
   */
  abstract concat(other: Readonly<Strip>): Strips;

  abstract isEqual(other: Readonly<Strip>): boolean;

  abstract toString(): string;
}
