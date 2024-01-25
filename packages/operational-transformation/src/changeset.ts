import { IndexStrip } from './index-strip';
import { RangeStrip } from './range-strip';
import { StringStrip } from './string-strip';
import Strip, { StripType } from './strip';
import { Strips } from './strips';

interface ChangesetOptions<T = string> {
  requiredLength?: number;
  length?: number;
  strips: Strips<T>;
}

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
    return new Changeset({
      requiredLength: 0,
      length: text.length,
      strips: new Strips([new StringStrip(text)]),
    });
  }

  /**
   * Length of the document before the change.
   * Required length to be able to apply to a document.
   */
  readonly requiredLength: number;

  /**
   * Length of the document after the change.
   */
  readonly length: number;

  readonly strips: Strips<T>;

  constructor(options: ChangesetOptions<T>) {
    this.strips = options.strips;
    this.requiredLength = options.requiredLength ?? options.strips.calcMaxIndex() + 1;
    this.length = options.length ?? options.strips.calcTotalLength();
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
    if (this.length < other.requiredLength) {
      throw new Error(
        `Unable to compose: ${String(this)} * ${String(other)}. this length ${
          this.length
        } is less than required length ${other.requiredLength}`
      );
    }

    return new Changeset({
      requiredLength: this.requiredLength,
      length: other.length,
      strips: new Strips(
        other.strips.values.flatMap((strip) => strip.reference(this.strips).values)
      ).compact(),
    });
  }

  // TODO refactor
  follow(other: Changeset<T>): Changeset<T> {
    const result: Strip<T>[] = [];

    let stripIndex = 0,
      stripPos = 0;
    let otherStripIndex = 0,
      otherStripPos = 0;
    while (
      stripIndex < this.strips.values.length ||
      otherStripIndex < other.strips.values.length
    ) {
      const strip = this.strips.values[stripIndex++];
      const otherStrip = other.strips.values[otherStripIndex++];

      // smaller pos checked first??
      if (stripPos < otherStripPos) {
        if (strip && strip.type === StripType.Insert) {
          // create method: strip.asRetained(pos);
          if (strip.length === 1) {
            result.push(new IndexStrip(stripPos));
          } else if (strip.length > 1) {
            result.push(new RangeStrip(stripPos, stripPos + strip.length - 1));
          }
        }
        if (otherStrip && otherStrip.type === StripType.Insert) {
          result.push(otherStrip);
        }
      } else {
        if (otherStrip && otherStrip.type === StripType.Insert) {
          result.push(otherStrip);
        }
        if (strip && strip.type === StripType.Insert) {
          // create method: strip.asRetained(pos);
          if (strip.length === 1) {
            result.push(new IndexStrip(stripPos));
          } else if (strip.length > 1) {
            result.push(new RangeStrip(stripPos, stripPos + strip.length - 1));
          }
        }
      }

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

    return new Changeset({
      requiredLength: this.length,
      strips: new Strips(result).compact(),
    });
  }

  toString() {
    return `(${this.requiredLength} -> ${this.length})[${String(this.strips)}]`;
  }
}
