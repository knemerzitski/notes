import { RangeStrip } from './range-strip';
import Strip, { EMPTY, StripType } from './strip';
import { Strips } from './strips';

/**
 * Represents a retained character from the original document.
 */
export class IndexStrip<T = string> implements Strip<T> {
  readonly index: number;
  readonly length = 1;
  readonly maxIndex;

  constructor(index: number) {
    this.index = index;
    this.maxIndex = this.index;
  }

  get type() {
    return StripType.Retain;
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

  // TODO test
  intersect(other: Strip<T>): Strip<T> {
    if (other instanceof RangeStrip) {
      if (other.startIndex <= this.index && this.index <= other.endIndex) {
        return this;
      }
    } else if (other instanceof IndexStrip) {
      if (this.index === other.index) {
        return this;
      }
    }

    return EMPTY;
  }

  toString() {
    return String(this.index);
  }
}
