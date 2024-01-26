import { IndexStrip } from './index-strip';
import { RangeStrip } from './range-strip';
import { StringStrip } from './string-strip';
import Strip, { StripType } from './strip';
import { Strips } from './strips';

/**
 * Represents a change to a document.
 */
export class Changeset<T = string> {
  //static

  // TODO test
  /**
   * Create initial changeset from text
   * @param text
   */
  static fromText(text: string) {
    return new Changeset(new Strips([new StringStrip(text)]));
  }

  /**
   * Length of the document after the change.
   * Is total length of all strips.
   */
  private _length = -1;

  /**
   * Highest index that is accessed by strips.
   */
  private _maxIndex = -1;

  /**
   * Strips is always compact.
   */
  readonly strips: Readonly<Strips<T>>;

  constructor(strips: Readonly<Strips<T>>) {
    this.strips = strips.compact();
  }

  // TODO test
  get length() {
    if (this._length === -1) {
      this._length = this.strips.calcTotalLength();
    }
    return this._length;
  }

  // TODO test
  get maxIndex() {
    if (this._maxIndex === -1) {
      this._maxIndex = this.strips.calcMaxIndex();
    }
    return this._maxIndex;
  }

  /**
   * Returns section of the Changeset as Chars
   * Negative {@link start}, {@link end} starts from end of array.
   * from the end of the array. E.g. -1 is the last element.
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues to the end of char.
   */
  slice(start = 0, end?: number): Strips<T> {
    if (start < 0) {
      start = (start % this.length) + this.length;
    }
    if (end && end < 0) {
      end = (end % this.length) + this.length + 1;
    }
    return this.strips.slice(start, end);
  }

  /**
   * Returns the strip singular value located at the specified index.
   * @param index The zero-based index of the desired code unit. A negative index will count back from the last strip.
   */
  at(index: number): Strip<T> | undefined {
    const { values } = this.slice(index, index + 1);
    if (values.length === 1) {
      return values[0];
    }
    return;
  }

  compose(other: Changeset<T>): Changeset<T> {
    return new Changeset(
      new Strips(
        other.strips.values.flatMap((strip) => {
          const refStrips = strip.reference(this.strips);
          if (refStrips.calcTotalLength() !== strip.length) {
            throw new Error(
              `Unable to compose ${String(this.strips)} * ${String(
                other.strips
              )}. Cannot index '${String(strip)}' in ${String(this.strips)}.`
            );
          }
          return refStrips.values;
        })
      ).compact()
    );
  }

  /**
   * Finds follow of this and other so that following criteria is met:
   * this.compose(this.follow(other)) = other.compose(other.follow(this))
   * In general: Af(A, B) = Bf(B, A), where A = this, B = other, f = follow
   */
  follow(other: Changeset<T>): Changeset<T> {
    const result: Strip<T>[] = [];

    let stripPos = 0;
    let otherStripPos = 0;
    for (
      let i = 0;
      i < this.strips.values.length || i < other.strips.values.length;
      i++
    ) {
      const strip = this.strips.values[i];
      const otherStrip = other.strips.values[i];

      const newStrips: Strip<T>[] = [];

      // Insertions in this become retained characters in follow(this, other)
      if (strip && strip.type === StripType.Insert) {
        if (strip.length === 1) {
          newStrips.push(new IndexStrip(stripPos));
        } else if (strip.length > 1) {
          newStrips.push(new RangeStrip(stripPos, stripPos + strip.length - 1));
        }
      }
      // Insertions in other become insertions in follow(this, other)
      if (otherStrip && otherStrip.type === StripType.Insert) {
        newStrips.push(otherStrip);
      }

      // Decide order of previous two insertions based on strips position so far
      if (otherStripPos <= stripPos) {
        newStrips.reverse();
      }
      result.push(...newStrips);

      // Retain whatever characters are retained in both this and other
      if (
        strip &&
        otherStrip &&
        strip.type === StripType.Retain &&
        otherStrip.type === StripType.Retain
      ) {
        result.push(strip.intersect(otherStrip));
      }

      if (strip) {
        stripPos += strip.length;
      }
      if (otherStrip) {
        otherStripPos += otherStrip.length;
      }
    }

    return new Changeset(new Strips(result).compact());
  }

  toString() {
    return `(${this.maxIndex} -> ${this.length})[${String(this.strips)}]`;
  }
}
