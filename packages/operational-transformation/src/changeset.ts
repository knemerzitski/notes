import { InsertStrip } from './insert-strip';
import { RetainStrip } from './retain-strip';
import { Strip } from './strip';
import { Strips } from './strips';

/**
 * Represents a change to a document (list of characters, or a string).
 * Strips is compact.
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
    // TODO ensure strips indices are ordered correctly...
    if (strips instanceof Strips) {
      this.strips = strips.compact();
    } else if (Array.isArray(strips)) {
      this.strips = new Strips(strips).compact();
    } else {
      this.strips = Strips.EMPTY;
    }
  }

  /**
   * @returns A new changeset that is a compostion of this and other.
   * E.g. ['hello'].compose([[0, 4], ' world']) = ['hello world']
   */
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

  // first common idex...
  /*
  !indices must be in order...
  0p[0,10]U[5,12] = [5,10] / E|[11,12]
  0p[0,12]U[5,10] = [5,10] / [11,12]|E
  0p[0,10]U[12,13] = E / E|[12,13]
  
  X =  "document"
  A = [4-7] "ment" (del "docu")
  B = [0-3,0-1] "docudo" (del "ment", append "do")

  from "ment" to "do"
  f(A,B) = ["do"]
  XA = "ment"
  XAfAB= "do"

  m(M,A) = [0-1]

  "do"
  */

  /**
   * Finds follow of this and other so that following criteria is met:
   * this.compose(this.follow(other)) = other.compose(other.follow(this))
   * In general: Af(A, B) = Bf(B, A), where A = this, B = other, f = follow
   */
  follow(other: Changeset<T>): Changeset<T> {
    const followStrips: Strip<unknown>[] = [];
    let followPos = 0;

    let pos = 0;
    let otherPos = 0;

    const stack = [...this.strips.values];
    stack.reverse();
    const otherStack = [...other.strips.values];
    otherStack.reverse();

    console.log(
      `>[${followStrips.join(', ')}] A(${stack.join(', ')}), B(${otherStack.join(', ')})`
    );
    while (stack.length > 0 && otherStack.length > 0) {
      const strip = stack.pop();
      const otherStrip = otherStack.pop();
      console.log(
        `@${followPos},${pos},${otherPos} A(${String(strip)}) <-> B(${String(
          otherStrip
        )})`
      );
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
            console.log('A, B intersection retained');
            //+1??
            followStrips.push(new RetainStrip(pos, pos + intersectionStrip.length - 1));
            followPos += intersectionStrip.length;

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
            console.log('A => to retained');
            tmpOrderStrips.push(strip.retain(pos));
            followPos += strip.length;
            if (otherStrip instanceof RetainStrip) {
              console.log('B => push back');
              // Put back other strip as it must be processed later due to strip being insertion
              otherStack.push(otherStrip);
              otherPos -= otherStrip.length;
            }
          }

          // Insertions in other become insertions
          if (otherStrip instanceof InsertStrip) {
            console.log('B insert');
            tmpOrderStrips.push(otherStrip);
            followPos += otherStrip.length;
            if (strip instanceof RetainStrip) {
              console.log('A => push back');
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
        console.log(
          `>[${followStrips.join(', ')}] A(${stack.join(', ')}), B(${otherStack.join(
            ', '
          )})`
        );

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
    console.log('result', String(followChangeset));
    return followChangeset;
  }

  toString() {
    return `(${this.strips.maxIndex + 1} -> ${this.strips.length})${String(this.strips)}`;
  }
}
