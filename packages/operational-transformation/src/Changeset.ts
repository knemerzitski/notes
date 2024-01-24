import Strip from './Strip';
import Strips from './Strips';

interface ChangesetOptions<T = string> {
  requiredLength?: number;
  length?: number;
  strips: Strips<T>;
}

/**
 * Represents a change to a document.
 */
export default class Changeset<T = string> {
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
        ...other.strips.values.flatMap((strip) => strip.reference(this.strips).values)
      ).compact(),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  merge(other: Changeset<T>): Changeset<T> {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  follow(other: Changeset<T>): Changeset<T> {
    throw new Error('Not implemented');
  }

  // TODO test
  static fromPOJO(value: unknown) {
    if (
      Array.isArray(value) &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number' &&
      Array.isArray(value[2])
    ) {
      return new Changeset({
        requiredLength: value[0],
        length: value[1],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        strips: Strips.fromPOJO(...value[2]),
      });
    }

    throw new Error(`Unable to deserialize to Changeset: ${String(value)}`);
  }

  toPOJO() {
    return [this.requiredLength, this.length, this.strips.toPOJO()];
  }

  toString() {
    return `(${this.requiredLength} -> ${this.length})[${String(this.strips)}]`;
  }
}
