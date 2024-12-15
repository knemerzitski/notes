import { Strips, EmptyStripStruct, StripStruct } from '.';

/**
 * Strip represents a range of similar properties in a changeset.
 * Strip is immutable.
 */
export abstract class Strip {
  static readonly EMPTY = new (class extends Strip {
    readonly EMPTY = true;

    length = 0;

    reference() {
      return Strips.EMPTY;
    }
    slice() {
      return this;
    }
    concat(strip: Strip) {
      return new Strips([strip]);
    }
    offset() {
      return this;
    }
    isEqual(strip: Strip): boolean {
      return strip === this;
    }
    toString() {
      return '∅';
    }
    serialize: () => unknown = () => {
      return EmptyStripStruct.createRaw(this);
    };
    parseValue: (value: unknown) => Strip = (value) => {
      return EmptyStripStruct.create(value);
    };
  })();

  abstract readonly length: number;

  /**
   * Returns strips that references values from a {@link strips}
   */
  abstract reference(strips: Strips): Strips;

  /**
   * Returns a section of the strip.
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   */
  abstract slice(start: number, end: number): Strip;

  /**
   * Add together both strips. Effect of both strips is retained and represented in returned value.
   */
  abstract concat(other: Strip): Strips;

  abstract offset(value: number): Strip;

  abstract isEqual(other: Strip): boolean;

  abstract toString(): string;

  abstract serialize(): unknown;

  static parseValue: (value: unknown) => Strip = (value) => {
    return StripStruct.create(value);
  };
}
