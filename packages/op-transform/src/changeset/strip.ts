import { InsertStrip } from './insert-strip';
import { RetainStrip } from './retain-strip';
import { Parseable, Serializable } from './serialize.types';
import { Strips } from './strips';

export type SerializedStrip = unknown;

/**
 * Strip represents a range of similar properties in a changeset.
 * Strip is immutable.
 */
export abstract class Strip implements Serializable<SerializedStrip> {
  static EMPTY: Strip & Parseable<Strip> = {
    length: 0,

    reference() {
      return Strips.EMPTY;
    },
    slice() {
      return this;
    },
    concat(strip: Strip) {
      return Strips.from(strip);
    },
    isEqual(strip: Strip): boolean {
      return strip === Strip.EMPTY;
    },
    toString() {
      return '(EMPTY)';
    },
    serialize() {
      return null;
    },
    parseValue(value: unknown) {
      if (value == null) {
        return this;
      }
      return;
    },
  };

  abstract length: number;

  /**
   * Returns strips that references values from a {@link strips}
   */
  abstract reference(strips: Strips): Strips;

  /**
   * Returns a section of the strip.
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues to the end of strip.
   */
  abstract slice(start?: number, end?: number): Strip;

  /**
   * Add together both strips. Effect of both strips is retained and represented in returned value.
   */
  abstract concat(other: Strip): Strips;

  abstract isEqual(other: Strip): boolean;

  abstract toString(): string;

  abstract serialize(): SerializedStrip;

  static parseValue(value: unknown): Strip {
    for (const StripKlass of [InsertStrip, RetainStrip, Strip.EMPTY]) {
      const strip = StripKlass.parseValue(value);
      if (strip) {
        return strip;
      }
    }

    throw new Error(`Value '${String(value)}' cannot be parsed to a Strip.`);
  }
}
