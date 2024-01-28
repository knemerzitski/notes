import { Strips } from './strips';

export const EMPTY: Strip<never> = {
  length: 0,

  reference() {
    return Strips.EMPTY;
  },
  slice() {
    return this;
  },
  concat<U>(strip: Strip<U>) {
    return Strips.from<U>(strip);
  },
  isEqual(strip: Strip<never>): boolean {
    return strip === EMPTY;
  },
  toString() {
    return 'EMPTY';
  },
};

/**
 * Generic representation of a continious range of objects for changesets.
 */
export interface Strip<T = string> {
  length: number;

  /**
   * Returns strips that references values from a {@link strips}
   */
  reference: (strips: Readonly<Strips<T>>) => Strips<T>;

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
  concat: (other: Strip<T>) => Strips<T>;

  isEqual(other: Strip<T>): boolean;

  toString(): string;
}
