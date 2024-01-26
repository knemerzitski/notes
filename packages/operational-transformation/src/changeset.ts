import { IndexStrip } from './index-strip';
import { RangeStrip } from './range-strip';
import Strip, { StripType } from './strip';
import { Strips } from './strips';

/**
 * Represents a change to a document.
 */
export class Changeset<T = string> {
  //static

  /**
   * Convinience method to create Changeset from spread syntax
   */
  static from<U>(...strips: Readonly<Strip<U>>[]) {
    return new Changeset<U>(strips);
  }

  /**
   * Strips is always compact.
   */
  readonly strips: Readonly<Strips<T>>;

  // TODO test constructors
  constructor(strips: Readonly<Strips<T>> | Readonly<Strip<T>[]>) {
    if (strips instanceof Strips) {
      this.strips = strips.compact();
    } else if (Array.isArray(strips)) {
      this.strips = new Strips(strips).compact();
    } else {
      this.strips = Strips.EMPTY;
    }
  }

  compose(other: Changeset<T>): Changeset<T> {
    return new Changeset(
      new Strips(
        other.strips.values.flatMap((strip) => {
          const refStrips = strip.reference(this.strips);
          if (refStrips.length !== strip.length) {
            throw new Error(
              `Unable to compose ${String(this.strips)} * ${String(
                other.strips
              )}. Cannot index '${String(strip)}' in ${String(this.strips)}.`
            );
          }
          return refStrips.values;
        })
      )
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
    return `(${this.strips.maxIndex} -> ${this.strips.length})[${String(this.strips)}]`;
  }
}
