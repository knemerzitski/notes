import { Maybe } from '../../../utils/src/types';

import {
  ChangesetStruct,
  RetainStrip,
  InsertStrip,
  Strip,
  Strips,
  ChangesetCreateError,
  ChangesetOperationError,
  DeleteStrip,
} from '.';

/**
 * Represents a change to a text (list of characters, or a string).
 * Changeset strips is compact and retain indexes are ordered.
 * Changeset is immutable.
 */
export class Changeset {
  static readonly EMPTY: Changeset = new (class extends Changeset {
    readonly EMPTY = true;
    override isEqual(other: Changeset): boolean {
      return other === this;
    }
  })();

  /**
   * Convinience method to create Changeset from spread syntax.
   */
  static from: (...strips: readonly Strip[]) => Changeset = (...strips) => {
    return new Changeset(strips);
  };

  /**
   * Quickly create a text insertion changeset that replaces all previous content.
   */
  static fromInsertion: (insertText: string) => Changeset = (insertText) => {
    return new Changeset([InsertStrip.create(insertText)]);
  };

  /**
   * Strips is always compact.
   */
  readonly strips: Strips;

  /**
   * Create new Changeset from either an array of strips or Strips instance
   * Strips will be compacted if not already.
   */
  constructor(stripsOrChangeset: Changeset | Strips | readonly Strip[] = []) {
    if (stripsOrChangeset instanceof Changeset) {
      this.strips = stripsOrChangeset.strips;
    } else if (stripsOrChangeset instanceof Strips) {
      this.strips = stripsOrChangeset.compact();
    } else if (Array.isArray(stripsOrChangeset)) {
      this.strips = new Strips(stripsOrChangeset).compact();
    } else {
      this.strips = Strips.EMPTY;
    }

    if (!this.strips.isRetainIndexesOrdered()) {
      throw new ChangesetCreateError(
        `Changeset strips retain indexes are not ascending ordered: ${String(
          this.strips
        )}`
      );
    }
  }

  get length() {
    return this.strips.length;
  }

  /**
   * Throws error if this changeset is not composable on {@link B}.
   */
  assertIsComposable(B: Changeset) {
    if (B === Changeset.EMPTY) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const A = this;

    if (A.strips.length <= B.strips.maxIndex) {
      throw new ChangesetOperationError(
        `Unable to compose A${String(this)} * B${String(
          B
        )}. ${A.strips.length} !== ${B.strips.maxIndex + 1} in A${A.inputOutputSizeString()} * ${B.inputOutputSizeString()}`
      );
    }
  }

  /**
   * Composition between changeset A(x->y) and B(y->z) is denoted as A * B(x->z)
   * @returns A new changeset that is a compostion of this and other.
   * E.g. ['hello'] * [[0, 4], ' world'] = ['hello world']
   */
  compose(B: Changeset): Changeset {
    if (B === Changeset.EMPTY) {
      return Changeset.EMPTY;
    }

    this.assertIsComposable(B);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const A = this;

    return new Changeset(
      new Strips(B.strips.values.flatMap((strip) => strip.reference(A.strips).values))
    );
  }

  /**
   *
   * Given:
   * X * A,  X * B \
   * A.follow(B) = B' or f(A,B) \
   *
   * Follow computes a new changeset B so that X * A * B'.\
   * Intention of B is kept in B':
   * - A inserted characters are retained
   * - B inserted characters are inserted
   * - A and B intersection of retained characters are kept (delete whatever either deleted)
   *
   * Follow is commutative:
   * X * A* f(A,B) = X * B * f(B,A) \
   * This is ensured by using lexicographical ordering for insertions in the same position.
   */
  follow(B: Changeset): Changeset {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const A = this;
    const resultStrips: Strip[] = [];

    let A_index = 0;
    let B_index = 0;
    let A_pos = 0;
    let B_pos = 0;

    const A_strips = [...A.strips.values.filter((strip) => !strip.isEqual(Strip.EMPTY))];
    const B_strips = [...B.strips.values.filter((strip) => !strip.isEqual(Strip.EMPTY))];

    while (A_index < A_strips.length && B_index < B_strips.length) {
      const a_strip = A_strips[A_index];
      const b_strip = B_strips[B_index];

      if (a_strip && b_strip) {
        // Retain whatever characters are retained in both, indices are translated according to this strips
        if (a_strip instanceof RetainStrip && b_strip instanceof RetainStrip) {
          if (
            a_strip.endIndex >= b_strip.startIndex &&
            b_strip.endIndex >= a_strip.startIndex
          ) {
            const leftIntersect = Math.max(a_strip.startIndex, b_strip.startIndex);
            const rightIntersect = Math.min(a_strip.endIndex, b_strip.endIndex);

            const translateOffset = A_pos - a_strip.startIndex;
            const intersectStrip = new RetainStrip(
              leftIntersect + translateOffset,
              rightIntersect + translateOffset
            );
            resultStrips.push(intersectStrip);

            // To intersect right remainder slice will be checked again
            if (rightIntersect < a_strip.endIndex) {
              // [part b_strip] [intersect] [part a_strip]<
              const sliceStrip = new RetainStrip(rightIntersect + 1, a_strip.endIndex);
              A_strips.splice(A_index, 1, sliceStrip);
              A_pos += a_strip.length - sliceStrip.length;
              B_index++;
              B_pos += b_strip.length;
            } else if (rightIntersect < b_strip.endIndex) {
              // [part a_strip] [intersect] [part b_strip]<
              const sliceStrip = new RetainStrip(rightIntersect + 1, b_strip.endIndex);
              B_strips.splice(B_index, 1, sliceStrip);
              A_index++;
              A_pos += a_strip.length;
              B_pos += b_strip.length - sliceStrip.length;
            } else {
              // [part a_strip/part b_strip] [intersect] [EMPTY]<
              A_index++;
              B_index++;
              A_pos += a_strip.length;
              B_pos += b_strip.length;
            }
          } else if (a_strip.endIndex < b_strip.startIndex) {
            // No intersection, a_strip is to the left => ignore it
            A_index++;
            A_pos += a_strip.length;
          } else {
            // No intersection, b_strip is to the left => ignore it
            B_index++;
            B_pos += b_strip.length;
          }
        } else {
          // Use temporary array to reverse insertion order later if needed
          const tmpInsertStrips = [];

          // Reverse if b_strip insert is later or
          // positions are same and b_strip is lexicographically ordered smaller
          // This ensures follow has commutative property an merge m(A,B) = m(B,A)
          const reverseInsert =
            B_pos < A_pos ||
            (A_pos === B_pos &&
              a_strip instanceof InsertStrip &&
              b_strip instanceof InsertStrip &&
              b_strip.value < a_strip.value);

          // Insertions in a_strip become retained characters
          if (a_strip instanceof InsertStrip) {
            tmpInsertStrips.push(a_strip.retain(A_pos));
            A_index++;
            A_pos += a_strip.length;
          }

          // Insertions in b_strip become insertions
          if (b_strip instanceof InsertStrip) {
            tmpInsertStrips.push(b_strip);
            B_index++;
            B_pos += b_strip.length;
          }

          if (reverseInsert) {
            tmpInsertStrips.reverse();
          }
          resultStrips.push(...tmpInsertStrips);
        }
      } else if (!a_strip) {
        A_index++;
      } else if (!b_strip) {
        B_index++;
      } else {
        break;
      }
    }

    // Add remaining insert strips
    for (; A_index < A_strips.length; A_index++) {
      const strip = A_strips[A_index];
      if (strip) {
        if (strip instanceof InsertStrip) {
          resultStrips.push(strip.retain(A_pos));
        }
        A_pos += strip.length;
      }
    }

    for (; B_index < B_strips.length; B_index++) {
      const b_strip = B_strips[B_index];
      if (b_strip) {
        if (b_strip instanceof InsertStrip) {
          resultStrips.push(b_strip);
        }
        B_pos++;
      }
    }

    const followChangeset = new Changeset(resultStrips);
    return followChangeset;
  }

  /**
   * Merge this and other changeset that both apply to same text.
   * X * m(A,B)
   */
  merge(other: Changeset): Changeset {
    return this.compose(this.follow(other));
  }

  /**
   * Finds inverse of this changeset. \
   * For any composable changeset A and B, following applies: \
   * A * B = C \
   * C * B.inverse(A) = A
   */
  inverse(other: Changeset) {
    const resultStrips = [];
    let pos = 0;
    let lastEndIndex = -1;
    for (const strip of this.strips.values) {
      if (strip instanceof RetainStrip) {
        const inverseStrip = RetainStrip.create(lastEndIndex + 1, strip.startIndex - 1);
        resultStrips.push(...inverseStrip.reference(other.strips).values);

        const existingStrip = RetainStrip.create(pos, pos + strip.length - 1);
        resultStrips.push(existingStrip);

        lastEndIndex = strip.endIndex;
      }
      pos += strip.length;
    }

    const lastInverseStrip = RetainStrip.create(
      lastEndIndex + 1,
      lastEndIndex + Math.max(this.strips.length, other.strips.length)
    );
    resultStrips.push(...lastInverseStrip.reference(other.strips).values);

    const resultChangeset = new Changeset(resultStrips);

    return resultChangeset;
  }

  /**
   * @returns Index of a retained character that is closest to {@link index}.
   */
  indexOfClosestRetained(index: number) {
    let pos = 0;
    if (this.hasOnlyInsertions()) {
      // If changeset has only insertion then place pos to closest side of insertion.
      const strip = this.strips.values[0];
      if (strip) {
        if (index < strip.length) {
          if (strip.length <= 2 * index) {
            return strip.length;
          } else {
            return pos;
          }
        }
      }
    }

    for (const strip of this.strips.values) {
      if (strip instanceof RetainStrip) {
        if (strip.startIndex <= index && index <= strip.endIndex + 1) {
          return pos + index - strip.startIndex;
        } else if (index < strip.startIndex) {
          return pos;
        }
      }
      pos += strip.length;
    }

    return pos;
  }

  /**
   * @returns Modified {@link other} changeset that has insertions replaced with retained characters if
   * it matches this changeset.
   */
  insertionsToRetained(other: Changeset) {
    const resultStrips: Strip[] = [];

    for (let i = 0; i < other.strips.values.length; i++) {
      const strip = other.strips.values[i];
      if (strip instanceof InsertStrip) {
        const prevStrip = other.strips.values[i - 1];
        const nextStrip = other.strips.values[i + 1];

        let sliceStart = 0;
        let sliceEnd = -1;
        if (prevStrip instanceof RetainStrip) {
          sliceStart = prevStrip.endIndex + 1;
        }
        if (nextStrip instanceof RetainStrip) {
          sliceEnd = nextStrip.startIndex;
        }

        const sliced = this.strips.slice(sliceStart, sliceEnd);

        let pos = 0;
        let foundMatch = false;
        for (const thisStrip of sliced.values) {
          if (thisStrip instanceof InsertStrip) {
            const offset = thisStrip.value.indexOf(strip.value);
            if (offset !== -1) {
              const startIndex = sliceStart + pos + offset;
              resultStrips.push(
                RetainStrip.create(startIndex, startIndex + strip.value.length - 1)
              );
              foundMatch = true;
              break;
            }
          }
          pos += thisStrip.length;
        }
        if (!foundMatch) {
          resultStrips.push(strip);
        }
      } else if (strip) {
        resultStrips.push(strip);
      }
    }

    return new Changeset(resultStrips);
  }

  /**
   * Adds DeleteStrips between RetainStrip gaps.
   * @param length Total length of text that this strips applies to.
   * @returns Strip array which includes DeleteStrip between RetainStrip
   */
  stripsWithDeleteStrips(length: number): Strip[] {
    let nextDeleteStart = 0;

    const result: Strip[] = [];

    for (const strip of this.strips.values) {
      if (strip instanceof RetainStrip) {
        const nextDeleteEnd = strip.startIndex - 1;
        result.push(DeleteStrip.create(nextDeleteStart, nextDeleteEnd));
        nextDeleteStart = strip.endIndex + 1;
      }

      result.push(strip);
    }

    result.push(DeleteStrip.create(nextDeleteStart, length - 1));

    return result;
  }

  /**
   * @returns This changeset is identity to other changeset.
   * In other words {@link other}.compose(this) = other.
   */
  isIdentity(other?: Changeset): boolean {
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

  joinInsertions() {
    return this.strips.joinInsertions();
  }

  hasOnlyInsertions() {
    return this.strips.hasOnlyInsertions();
  }

  hasRetainStrips() {
    return this.strips.hasRetainStrips();
  }

  isEqual(other: Changeset): boolean {
    return this.strips.isEqual(other.strips);
  }

  private inputOutputSizeString() {
    return `(${this.strips.maxIndex + 1} -> ${this.strips.length})`;
  }

  toString() {
    return `${this.inputOutputSizeString()}${String(this.strips)}`;
  }

  serialize() {
    return ChangesetStruct.createRaw(this);
  }

  toJSON() {
    return this.serialize();
  }

  static parseValue: (value: unknown) => Changeset = (value) => {
    return ChangesetStruct.create(value);
  };

  static parseValueMaybe: (value: unknown) => Maybe<Changeset> = (value) => {
    if (value === undefined) return;
    return this.parseValue(value);
  };
}
