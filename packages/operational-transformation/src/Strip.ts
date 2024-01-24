import IndexStrip from './IndexStrip';
import RangeStrip from './RangeStrip';
import StringStrip from './StringStrip';
import Strips from './Strips';

/**
 * Generic representation of a continious range of objects for changesets.
 */
export default abstract class Strip<T = string> {
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
      return Strips.from<U>(strip);
    },
    toPOJO() {
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
   * null | undefined => Strip.EMPTY
   */
  static fromPOJO(value: unknown) {
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

    throw new Error(`Unable to convert to Strip: ${String(value)}`);
  }

  abstract toPOJO(): unknown;
}
