import { Changeset } from '..';

/**
 * Strip represents a range of similar properties.
 * Strip is immutable.
 */
export abstract class Strip {
  static is: (strip: unknown) => strip is Strip = (strip) => {
    return strip instanceof Strip;
  };

  /**
   * Text length required to apply this strip
   */
  abstract readonly inputLength: number;

  /**
   * Text length produced after strip is applied to text
   */
  abstract readonly outputLength: number;

  /**
   * Actual length of strip itself, how much space it occupies in Changeset
   */
  abstract readonly length: number;

  /**
   * @returns Subset of {@link changeset} that is referenced by this strip.
   */
  abstract reference(changeset: Changeset): readonly Strip[];

  /**
   * Returns a slice of the strip.
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   */
  abstract slice(start: number, end?: number): Strip;

  abstract isEqual(other: Strip): boolean;

  abstract isEmpty(): boolean;

  abstract serialize(): unknown;

  /**
   * Add together both strips to make it more compact.
   */
  concat(other: Strip): Strip | [Strip, Strip] {
    if (other.isEmpty()) {
      return this as Strip;
    }

    return [this, other];
  }

  toString(): string {
    if (this.isEmpty()) {
      return '∅';
    }

    return 'unknown';
  }

  toJSON() {
    return this.serialize();
  }
}
