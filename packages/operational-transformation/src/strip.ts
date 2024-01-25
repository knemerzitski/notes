import { Strips } from './strips';

export enum StripType {
  Retain = 'retain',
  Insert = 'insert',
  Empty = 'empty',
}

export const EMPTY: Strip<never> = {
  length: 0,
  maxIndex: -1,
  type: StripType.Empty,

  reference() {
    return Strips.EMPTY;
  },
  slice() {
    return this;
  },
  concat<U>(strip: Strip<U>) {
    return Strips.from<U>(strip);
  },
  intersect() {
    return this;
  },
};

/**
 * Generic representation of a continious range of objects for changesets.
 */
export default interface Strip<T = string> {
  length: number;
  /**
   * Max index that this Char can reference.
   * -1 if Char uses no references.
   */
  maxIndex: number;

  type: StripType;

  /**
   * Returns strips that references values from a {@link strips}
   */
  reference: (strips: Strips<T>) => Strips<T>;

  /**
   * Returns a section of the strip.
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues to the end of strip.
   */
  slice: (start?: number, end?: number) => Strip<T>;

  /**
   * Add together both strips. Effect of both strips is retained and represented in returned value.
   */
  concat: (strip: Strip<T>) => Strips<T>;

  /**
   * Find intersection between this and other strip.
   * E.g. ranges [2-5].intersect([3-6]) = [3-5]
   */
  intersect: (strip: Strip<T>) => Strip<T>;
}
