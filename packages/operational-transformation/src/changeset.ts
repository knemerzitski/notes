import { InsertStrip } from './insert-strip';
import { RetainStrip } from './retain-strip';
import { Strip } from './strip';
import { Strips } from './strips';

/**
 * Represents a change to a document (list of characters, or a string).
 * Changeset strips is compact and retain indexes are ordered.
 */
export class Changeset {
  static EMPTY = new Changeset();

  /**
   * Convinience method to create Changeset from spread syntax.
   */
  static from(...strips: Readonly<Strip>[]) {
    return new Changeset(strips);
  }

  /**
   * Strips is always compact.
   */
  readonly strips: Readonly<Strips>;

  /**
   * Create new Changeset from either an array of strips or Strips instance
   * Strips will be compacted if not already.
   */
  constructor(strips: Readonly<Strips> | Readonly<Strip[]> = []) {
    if (strips instanceof Strips) {
      this.strips = strips.compact();
    } else if (Array.isArray(strips)) {
      this.strips = new Strips(strips).compact();
    } else {
      this.strips = Strips.EMPTY;
    }

    if (!this.strips.isRetainIndexesOrdered()) {
      throw new Error(
        `Changeset strips retain indexes are not ascending ordered: ${String(
          this.strips
        )}`
      );
    }
  }

  /**
   * @returns A new changeset that is a compostion of this and other.
   * E.g. ['hello'].compose([[0, 4], ' world']) = ['hello world']
   */
  compose(other: Changeset): Changeset {
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
  follow(other: Changeset): Changeset {
    const resultStrips: Strip[] = [];

    let index = 0;
    let otherIndex = 0;
    let pos = 0;
    let otherPos = 0;

    const strips = [...this.strips.values];
    const otherStrips = [...other.strips.values];

    while (index < strips.length && otherIndex < otherStrips.length) {
      const strip = strips[index];
      const otherStrip = otherStrips[otherIndex];

      if (strip && otherStrip) {
        // Retain whatever characters are retained in both, indices are translated according to this strips
        if (strip instanceof RetainStrip && otherStrip instanceof RetainStrip) {
          if (
            strip.endIndex >= otherStrip.startIndex &&
            otherStrip.endIndex >= strip.startIndex
          ) {
            const leftIntersect = Math.max(strip.startIndex, otherStrip.startIndex);
            const rightIntersect = Math.min(strip.endIndex, otherStrip.endIndex);

            const translateOffset = pos - strip.startIndex;
            const intersectStrip = new RetainStrip(
              leftIntersect + translateOffset,
              rightIntersect + translateOffset
            );
            resultStrips.push(intersectStrip);

            // To intersect right remainder slice will be checked again
            if (rightIntersect < strip.endIndex) {
              // [part otherStrip] [intersect] [part strip]<
              const sliceStrip = new RetainStrip(rightIntersect + 1, strip.endIndex);
              strips.splice(index, 1, sliceStrip);
              pos += strip.length - sliceStrip.length;
              otherIndex++;
              otherPos += otherStrip.length;
            } else if (rightIntersect < otherStrip.endIndex) {
              // [part strip] [intersect] [part otherStrip]<
              const sliceStrip = new RetainStrip(rightIntersect + 1, otherStrip.endIndex);
              otherStrips.splice(otherIndex, 1, sliceStrip);
              index++;
              pos += strip.length;
              otherPos += otherStrip.length - sliceStrip.length;
            } else {
              // [part strip/part otherStrip] [intersect] [EMPTY]<
              index++;
              otherIndex++;
              pos += strip.length;
              otherPos += otherStrip.length;
            }
          } else if (strip.endIndex < otherStrip.startIndex) {
            // No intersection, strip is to the left => ignore it
            index++;
            pos += strip.length;
          } else {
            // No intersection, otherStrip is to the left => ignore it
            otherIndex++;
            otherPos += otherStrip.length;
          }
        } else {
          // Use temporary array to reverse insertion order later if needed
          const tmpInsertStrips = [];

          // Insertions in this become retained characters
          if (strip instanceof InsertStrip) {
            tmpInsertStrips.push(strip.retain(pos));
            index++;
            pos += strip.length;
          }

          // Insertions in other become insertions
          if (otherStrip instanceof InsertStrip) {
            tmpInsertStrips.push(otherStrip);
            otherIndex++;
            otherPos += otherStrip.length;
          }

          if (otherPos < pos) {
            // otherStrip starts at a smaller index, so insert it first
            tmpInsertStrips.reverse();
          } else if (pos === otherPos) {
            // Since position of both insertions is same,
            // decide insertion by lexicographical order of values
            // This ensures follow has commutative property
            if (
              strip instanceof InsertStrip &&
              otherStrip instanceof InsertStrip &&
              otherStrip.value < strip.value
            ) {
              tmpInsertStrips.reverse();
            }
          }
          resultStrips.push(...tmpInsertStrips);
        }
      }
    }

    // Add remaining insert strips
    for (; index < strips.length; index++) {
      const strip = strips[index];
      if (strip) {
        if (strip instanceof InsertStrip) {
          resultStrips.push(strip.retain(pos));
        }
        pos += strip.length;
      }
    }

    for (; otherIndex < otherStrips.length; otherIndex++) {
      const otherStrip = otherStrips[otherIndex];
      if (otherStrip) {
        if (otherStrip instanceof InsertStrip) {
          resultStrips.push(otherStrip);
        }
        otherPos++;
      }
    }

    const followChangeset = new Changeset(resultStrips);
    return followChangeset;
  }

  /**
   * @returns This changeset is identity to other changeset.
   * In other words {@link other}.compose(this) = other.
   */
  isIdentity(other?: Readonly<Changeset>): boolean {
    if (other) {
      if (other.strips.values.length === 0) {
        return this.strips.values.length === 0;
      }

      if (this.strips.values.length !== 1) return false;
      const strip = this.strips.values[0];
      if (!strip || !(strip instanceof RetainStrip)) return false;

      return strip.length === other.strips.length;
    } else {
      if (this.strips.values.length === 0) return true;

      if (this.strips.values.length !== 1) return false;
      const strip = this.strips.values[0];
      if (!strip || !(strip instanceof RetainStrip)) return false;

      return strip.startIndex === 0;
    }
  }

  /**
   * @returns changeset that is identity to this changeset
   */
  getIdentity() {
    if (this.strips.length === 0) return Changeset.EMPTY;
    return new Changeset(new Strips([new RetainStrip(0, this.strips.length - 1)]));
  }

  isEqual(other: Changeset): boolean {
    return this.strips.isEqual(other.strips);
  }

  toString() {
    return `(${this.strips.maxIndex + 1} -> ${this.strips.length})${String(this.strips)}`;
  }
}
