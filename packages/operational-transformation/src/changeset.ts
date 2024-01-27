import { InsertStrip } from './insert-strip';
import { RetainStrip } from './retain-strip';
import { Strip } from './strip';
import { Strips } from './strips';

/**
 * Identity changeset (n -> n)[0,1,2,...,n-1]
 */
export const IDENTITY: Readonly<Changeset<never>> = {
  strips: {
    values: [],
    length: 0,
    maxIndex: 0,
    slice(): Strips<never> {
      return Strips.EMPTY;
    },
    at(): Strip<never> | undefined {
      return;
    },
    compact(): Strips<never> {
      return Strips.EMPTY;
    },
    isRetainIndexesOrdered(): boolean {
      return true;
    },
  },
  compose(other: Changeset<never>): Changeset<never> {
    return other;
  },
  follow(other: Changeset<never>): Changeset<never> {
    return other;
  },
};

/**
 * Represents a change to a document (list of characters, or a string).
 * Changeset strips is compact and retain indexes are ordered.
 */
export class Changeset<T = string> {
  /**
   * Convinience method to create Changeset from spread syntax.
   */
  static from<U>(...strips: Readonly<Strip<U>>[]) {
    return new Changeset<U>(strips);
  }

  /**
   * Strips is always compact.
   */
  readonly strips: Readonly<Strips<T>>;

  /**
   * Create new Changeset from either an array of strips or Strips instance
   * Strips will be compacted if not already.
   */
  constructor(strips: Readonly<Strips<T>> | Readonly<Strip<T>[]>) {
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
  compose(other: Changeset<T>): Changeset<T> {
    if (other === IDENTITY) return this;

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
    if (other === IDENTITY) return this;

    const followStrips: Strip<T>[] = [];

    let pos = 0;
    let otherPos = 0;

    const stack = [...this.strips.values];
    stack.reverse();
    const otherStack = [...other.strips.values];
    otherStack.reverse();

    while (stack.length > 0 && otherStack.length > 0) {
      const strip = stack.pop();
      const otherStrip = otherStack.pop();
      if (strip && otherStrip) {
        // Retain whatever characters are retained in both
        if (strip instanceof RetainStrip && otherStrip instanceof RetainStrip) {
          if (
            strip.endIndex >= otherStrip.startIndex &&
            otherStrip.endIndex >= strip.startIndex
          ) {
            // Retain common indices
            const intersectionStrip = new RetainStrip(
              Math.max(strip.startIndex, otherStrip.startIndex),
              Math.min(strip.endIndex, otherStrip.endIndex)
            );
            followStrips.push(new RetainStrip(pos, pos + intersectionStrip.length - 1));

            // Slice on right must be checked against further strips, so push it to appropriate stack
            if (intersectionStrip.endIndex < strip.endIndex) {
              const sliceStrip = new RetainStrip(
                intersectionStrip.endIndex + 1,
                strip.endIndex
              );
              stack.push(sliceStrip);
              pos -= sliceStrip.length;
            } else if (intersectionStrip.endIndex < otherStrip.endIndex) {
              const sliceStrip = new RetainStrip(
                intersectionStrip.endIndex + 1,
                otherStrip.endIndex
              );
              otherPos -= sliceStrip.length;
              otherStack.push(sliceStrip);
            }
          }
        } else {
          const tmpOrderStrips = [];

          // Insertions in this become retained characters
          if (strip instanceof InsertStrip) {
            tmpOrderStrips.push(strip.retain(pos));
            if (otherStrip instanceof RetainStrip) {
              // Put back other strip as it must be processed later due to strip being insertion
              otherStack.push(otherStrip);
              otherPos -= otherStrip.length;
            }
          }

          // Insertions in other become insertions
          if (otherStrip instanceof InsertStrip) {
            tmpOrderStrips.push(otherStrip);
            if (strip instanceof RetainStrip) {
              // Put back strip as it must be processed later due to other strip being insertion
              stack.push(strip);
              pos -= strip.length;
            }
          }

          if (otherPos < pos) {
            // Other starts at a smaller index, so insert it first
            tmpOrderStrips.reverse();
          } else if (pos === otherPos) {
            // Since position of both insertions are same
            // decide insertion by lexicographical order of values
            // This ensures follow has commutative property
            if (
              strip instanceof InsertStrip &&
              otherStrip instanceof InsertStrip &&
              otherStrip.value < strip.value
            ) {
              tmpOrderStrips.reverse();
            }
          }
          followStrips.push(...tmpOrderStrips);
        }

        pos += strip.length;
        otherPos += otherStrip.length;
      }
    }

    // Add remaining strips from stack
    for (let i = stack.length - 1; i >= 0; i--) {
      const strip = stack[i];
      if (strip instanceof InsertStrip) {
        followStrips.push(strip.retain(pos));
        pos += strip.length;
      }
    }
    for (let i = otherStack.length - 1; i >= 0; i--) {
      const otherStrip = otherStack[i];
      if (otherStrip instanceof InsertStrip) {
        followStrips.push(otherStrip);
      }
    }

    const followChangeset = new Changeset(followStrips);
    return followChangeset;
  }

  toString() {
    return `(${this.strips.maxIndex + 1} -> ${this.strips.length})${String(this.strips)}`;
  }
}
