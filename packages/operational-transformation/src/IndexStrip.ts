import RangeStrip from './RangeStrip';
import Strip from './Strip';
import Strips from './Strips';

/**
 * Represents a retained character from the original document.
 */
export default class IndexStrip<T = string> implements Strip<T> {
  readonly index: number;

  constructor(index: number) {
    this.index = index;
  }

  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get length() {
    return 1;
  }

  get maxIndex() {
    return this.index;
  }

  /**
   * @returns Value from strips at {@link index}
   */
  reference(strips: Strips<T>): Strips<T> {
    const strip = strips.at(this.index);
    return strip ? Strips.from(strip) : Strips.EMPTY;
  }

  /**
   * @returns Cannot slice singular index, so it just returns this
   */
  slice() {
    return this;
  }

  concat(other: Strip<T>): Strips<T> {
    if (other instanceof IndexStrip && this.index + 1 === other.index) {
      // E.g. 1 + 2 => [1,2]
      return Strips.from(new RangeStrip(this.index, other.index));
    } else if (other instanceof RangeStrip && this.index + 1 === other.startIndex) {
      // E.g. 1 + [2,5] => [1,5]
      return Strips.from(new RangeStrip(this.index, other.endIndex));
    }

    return Strips.from(this, other);
  }

  toPOJO(): unknown {
    return this.index;
  }

  toString() {
    return String(this.index);
  }
}
