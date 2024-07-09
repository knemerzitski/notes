import { Serializable } from '~utils/serialize';

import { InsertStrip } from './insert-strip';
import { RetainStrip } from './retain-strip';
import { Strip } from './strip';
import { SerializedStrips, Strips } from './strips';

export type SerializedChangeset = SerializedStrips;

/**
 * Represents a change to a text (list of characters, or a string).
 * Changeset strips is compact and retain indexes are ordered.
 * Changeset is immutable.
 */
export class Changeset implements Serializable<SerializedChangeset> {
  /**
   * Convinience method to create Changeset from spread syntax.
   */
  static from(...strips: readonly Strip[]) {
    return new Changeset(strips);
  }

  /**
   * Quickly create a text insertion changeset that replaces all previous content.
   */
  static fromInsertion(insertText: string) {
    return new Changeset([InsertStrip.create(insertText)]);
  }

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
      throw new Error(
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
   * Composition between changeset A and B is denoted as A * B
   * @returns A new changeset that is a compostion of this and other.
   * E.g. ['hello'] * [[0, 4], ' world'] = ['hello world']
   */
  compose(other: Changeset): Changeset {
    return new Changeset(
      new Strips(
        other.strips.values.flatMap((strip) => {
          const refStrips = strip.reference(this.strips);
          if (refStrips.length !== strip.length) {
            throw new Error(
              `Unable to compose ${String(this)} * ${String(
                other
              )}. Cannot index '${String(strip)}' in ${String(this.strips)}.`
            );
          }
          return refStrips.values;
        })
      )
    );
  }

  /**
   *
   * Given changesets: \
   * X - base/tail changeset \
   * A - this, X * A (A is composable on X) \
   * B - other, X *B (B is composable on X) \
   * Follow computes a new changeset B' that is composable on X * A * B'
   * so that intention of B is kept:
   * - A inserted characters are kept.
   * - A and B intersection of retained characters are kept.
   *
   * Follow has commutative property with previous change: \
   * X * A* f(A,B) = X * B * f(B,A) \
   * This property is ensured by ordering changes at same position lexicographically.
   */
  follow(other: Changeset): Changeset {
    const resultStrips: Strip[] = [];

    let index = 0;
    let otherIndex = 0;
    let pos = 0;
    let otherPos = 0;

    const strips = [...this.strips.values.filter((strip) => !strip.isEqual(Strip.EMPTY))];
    const otherStrips = [
      ...other.strips.values.filter((strip) => !strip.isEqual(Strip.EMPTY)),
    ];

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

          // Reverse if other insert is later or
          // positions are same and other is lexicographically ordered smaller
          // This ensures follow has commutative property an merge m(A,B) = m(B,A)
          const reverseInsert =
            otherPos < pos ||
            (pos === otherPos &&
              strip instanceof InsertStrip &&
              otherStrip instanceof InsertStrip &&
              otherStrip.value < strip.value);

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

          if (reverseInsert) {
            tmpInsertStrips.reverse();
          }
          resultStrips.push(...tmpInsertStrips);
        }
      } else if (!strip) {
        index++;
      } else if (!otherStrip) {
        otherIndex++;
      } else {
        break;
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
   * Merge this and other changeset that both apply to same text.
   * X * m(A,B)
   */
  merge(other: Changeset): Changeset {
    return this.compose(this.follow(other));
  }

  /**
   * Finds second change that is applied after the first when
   * they're swapped. \
   * Given that AXY = AY'X' => X' = X.{@link findSwapNewSecondChange}(Y,Y')
   * @param this X
   * @param oldSecond Y
   * @param newFirst Y'
   * @returns X'
   */
  findSwapNewSecondChange(oldSecond: Changeset, newFirst: Changeset): Changeset {
    const resultStrips: Strip[] = [];

    let newFirstInsertPos = 0;
    let newFirstInsertIndex = 0;
    let insertionSearchIndex: number | undefined = undefined;

    let newFirstRetainPos = 0;
    let newFirstRetainIndex = 0;

    for (const strip of oldSecond.strips.values) {
      if (strip instanceof InsertStrip) {
        let foundMatch = false;
        for (
          ;
          newFirstInsertIndex < newFirst.strips.values.length;
          newFirstInsertIndex++
        ) {
          const insertionStrip = newFirst.strips.values[newFirstInsertIndex];
          if (!insertionStrip) {
            throw new Error(
              `Unexpected missing strip in newFirst '${String(
                newFirst
              )}' at index ${newFirstInsertIndex}`
            );
          }

          if (insertionStrip instanceof InsertStrip) {
            const index = insertionStrip.value.indexOf(strip.value, insertionSearchIndex);
            if (index !== -1) {
              const startIndex = newFirstInsertPos + index;
              resultStrips.push(
                RetainStrip.create(startIndex, startIndex + strip.length - 1)
              );
              insertionSearchIndex = index + 1;
              foundMatch = true;
              break;
            }
          }

          insertionSearchIndex = undefined;
          newFirstInsertPos += insertionStrip.length;
        }
        if (!foundMatch) {
          throw new Error(`Strip '${String(strip)}' not found in ${String(newFirst)}`);
        }
      } else if (strip instanceof RetainStrip) {
        const refStrips = strip.reference(this.strips);
        if (refStrips.length !== strip.length) {
          throw new Error(`Cannot index '${String(strip)}' in ${String(this.strips)}.`);
        }

        for (const refStrip of refStrips.values) {
          if (refStrip instanceof InsertStrip) {
            resultStrips.push(refStrip);
          } else if (refStrip instanceof RetainStrip) {
            let foundLength = 0;
            for (
              ;
              newFirstRetainIndex < newFirst.strips.values.length;
              newFirstRetainIndex++
            ) {
              const retainStrip = newFirst.strips.values[newFirstRetainIndex];
              if (!retainStrip) {
                throw new Error(
                  `Unexpected missing strip in newFirst '${String(
                    newFirst
                  )}' at index ${newFirstRetainIndex}`
                );
              }

              if (retainStrip instanceof RetainStrip) {
                const isLeftOuter = refStrip.endIndex < retainStrip.startIndex;
                if (isLeftOuter) {
                  break;
                }

                const intersectionStartIndex = Math.max(
                  refStrip.startIndex,
                  retainStrip.startIndex
                );
                const intersectionEndIndex = Math.min(
                  refStrip.endIndex,
                  retainStrip.endIndex
                );
                if (intersectionStartIndex <= intersectionEndIndex) {
                  const offset = intersectionStartIndex - retainStrip.startIndex;
                  const len = intersectionEndIndex - intersectionStartIndex + 1;

                  const startIndex = newFirstRetainPos + offset;

                  resultStrips.push(RetainStrip.create(startIndex, startIndex + len - 1));

                  foundLength += len;
                }

                const hasRetainRemainder = refStrip.endIndex < retainStrip.endIndex;
                if (hasRetainRemainder) {
                  break;
                }
              }

              newFirstRetainPos += retainStrip.length;
            }
            if (foundLength !== refStrip.length) {
              throw new Error(
                `Strip '${String(refStrip)}' referenced from '${String(
                  strip
                )}' not found in ${String(newFirst)}`
              );
            }
          }
        }
      }
    }

    return new Changeset(resultStrips);
  }

  /**
   * Swap order of two latest changes that have yet to be applied to this changeset (tail).
   * Given composition AXY, finds changes Y' and X' so that
   * AXY = AY'X' (composed text is same)
   * @param this A (base text)
   * @param firstChange X - Changeset that is composable on base text
   * @param secondChange Y - Changeset that is composable on X
   * @returns [Y', X'] Y' - is composable on base text A, X' - is compoable on Y'
   */
  swapChanges(firstChange: Changeset, secondChange: Changeset): [Changeset, Changeset] {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const A = this;
    const X = firstChange;
    const Y = secondChange;

    const undoX = X.inverse(A);
    const Y_ = undoX.follow(Y);
    const X_ = X.findSwapNewSecondChange(Y, Y_);
    return [Y_, X_];
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

  toString() {
    return `(${this.strips.maxIndex + 1} -> ${this.strips.length})${String(this.strips)}`;
  }

  serialize(): SerializedChangeset {
    return this.strips.serialize();
  }

  static parseValue(value: unknown): Changeset {
    if (value instanceof Changeset) return value;
    return new Changeset(Strips.parseValue(value));
  }

  static parseValueMaybe(value: unknown) {
    if (value === undefined) return;
    return this.parseValue(value);
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Changeset {
  export const EMPTY = new Changeset();
}
