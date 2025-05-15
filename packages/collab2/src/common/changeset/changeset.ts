import {
  ChangesetError,
  ChangesetStruct,
  InsertStrip,
  RangeStrip,
  RetainStrip,
  Strip,
} from '.';
import { applyToText } from './utils/appy-to-text';
import { compact } from './utils/compact';
import { assertIsComposable, compose, isComposable } from './utils/compose';
import { follow, isFollowable } from './utils/follow';
import { followPosition } from './utils/follow-position';
import { fromText } from './utils/from-text';
import { identity } from './utils/identity';
import { inverse } from './utils/inverse';
import { isOrderedAscending } from './utils/is-ordered-ascending';
import { maxInputLength, outputLengthSum } from './utils/length';
import { isNoOp, removeNoOps } from './utils/no-op';
import { parse } from './utils/parse';
import { stripsArray } from './utils/strips-array';
import { toString } from './utils/to-string';
import { withRemoveStrips } from './utils/with-remove-strips';

/**
 * Represents how to change text.
 *
 * - Immutable
 * - Retained characters appear only once
 * - Retained characters are in ascending order
 * - Strips are compact
 */
export class Changeset {
  static applyToText = applyToText;
  static compose = compose;
  static assertIsComposable = assertIsComposable;
  static isComposable = isComposable;
  static followPosition = followPosition;
  static follow = follow;
  static isFollowable = isFollowable;
  static fromText = fromText;
  static identity = identity;
  static inverse = inverse;
  static isNoOp = isNoOp;
  static removeNoOps = removeNoOps;
  static parse = parse;

  static readonly EMPTY = new Changeset(0, []);

  static create(
    inputLength: number,
    value: Changeset | readonly Strip[] | Strip
  ): Changeset {
    if (Changeset.is(value)) {
      return value;
    }

    if (inputLength < 0) {
      throw new ChangesetError('inputLength cannot be negative');
    }

    const strips = compact(withRemoveStrips(inputLength, stripsArray(value)));
    if (strips.length === 0 && inputLength === 0) {
      return Changeset.EMPTY;
    }

    if (!isOrderedAscending(strips)) {
      throw new ChangesetError(`Strips are not ordered ascending: ${String(strips)}`);
    }

    const stripsMaxInputLength = maxInputLength(strips);
    if (inputLength < stripsMaxInputLength) {
      throw new ChangesetError(
        `Invalid inputLength ${inputLength} but strip requires length ${stripsMaxInputLength}: ${String(strips)}`
      );
    }

    return new Changeset(inputLength, strips);
  }

  static is: (value: unknown) => value is Changeset = (value) => {
    return value instanceof Changeset;
  };

  readonly outputLength: number;

  private constructor(
    readonly inputLength: number,
    public readonly strips: readonly Strip[] = []
  ) {
    this.outputLength = outputLengthSum(this.strips);
  }

  /**
   * @deprecated
   * TODO optionaly include insertions or add feature to mark retained characters to easily find them
   * Slices by retained characters based on Changeset itself.
   * E.g ["a",2-5,"bc",8-14].sliceRetained(4,9) = [4-5,"bc",8]
   *
   * E.g.
   * ```
   * (7:"ab",0-4,"hijklm",5-6).sliceRetained(3,5) = (3-4,"hijlkm")
   * // a,b,0,1,2,3,4,h,i,j,k,l,m,5,6
   * //           ^start          ^end
   * ```
   *
   * @param start
   * @param end Exclusive
   */
  sliceRetained(start = 0, end = start + 1): Strip[] {
    const result: Strip[] = [];

    let pos = 0;
    for (const strip of this.strips) {
      if (RangeStrip.is(strip)) {
        if (strip.outputLength > 0) {
          const resultStrip = RetainStrip.create(
            Math.max(start, strip.start),
            Math.min(end, strip.end)
          );
          if (!resultStrip.isEmpty()) {
            result.push(resultStrip);
          }
        }

        if (end <= strip.end) {
          break;
        }
      } else if (strip.outputLength > 0 && pos >= start) {
        result.push(strip);
      }

      pos += strip.length;
    }

    return result;
  }

  /**
   * Returns a region of the strips based on text indexes.
   *
   * E.g.
   * ```
   * (7:"ab",0-4,"hijklm",5-6).sliceText(4,9) = (2-4,"hi")
   * // a,b,0,1,2,3,4,h,i,j,k,l,m,5,6
   * //         ^start    ^end
   * ```
   *
   * @param start The index to the beginning.
   * @param end The index to the end. Is exclusive - end index is not included.
   * Unspecified value continues until the end.
   */
  sliceText(start = 0, end = this.outputLength): Strip[] {
    if (start < 0) {
      start += this.outputLength;
    }
    if (end < 0) {
      end += this.outputLength + 1;
    }
    if (start === end || end < start) {
      return [];
    }

    const result: Strip[] = [];
    let pos = 0;
    for (const strip of this.strips) {
      if (strip.outputLength === 0) {
        continue;
      }

      const nextOutPos = pos + strip.outputLength;

      // Strip is past start
      if (nextOutPos > start) {
        const absStart = Math.max(start, pos);
        const absEnd = end ? Math.min(end, nextOutPos) : nextOutPos;
        const relStart = absStart - pos;
        const relEnd = absEnd - pos;
        const slicedStrip = strip.slice(relStart, relEnd);
        result.push(slicedStrip);
      }

      pos = nextOutPos;
      if (pos >= end) {
        break;
      }
    }

    return result;
  }

  /**
   * Returns the strip with length of 1 at specified index.
   * @param index The zero-based index of the desired strip.
   * A negative index will count back from the last strip.
   */
  atText(index: number): Strip | undefined {
    if (index < 0) {
      index += this.outputLength;
    }

    return this.sliceText(index, index + 1)[0];
  }

  /**
   * @returns slice of strips thats been shrunk from left and right
   */
  shrinkText(left: number, right: number): Strip[] {
    const start = left;
    const end = this.outputLength - right;

    return this.sliceText(start, end);
  }

  /**
   * Changesets are equal when all strips are equal
   */
  isEqual(other: Changeset): boolean {
    if (
      this.inputLength !== other.inputLength ||
      this.outputLength !== other.outputLength ||
      this.strips.length !== other.strips.length
    ) {
      return false;
    }

    for (let i = 0; i < this.strips.length; i++) {
      const strip = this.strips[i];
      const otherStrip = other.strips[i];
      if (strip !== otherStrip) {
        if (!strip || !otherStrip) {
          return false;
        }

        if (!strip.isEqual(otherStrip)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Changeset is identity when composing it has no effect on the text
   */
  isIdentity(): boolean {
    if (this.isEmpty()) {
      return true;
    }

    if (this.inputLength !== this.outputLength || this.strips.length > 1) {
      return false;
    }

    const isOnlyStripRetain = RetainStrip.is(this.strips[0]);

    return isOnlyStripRetain;
  }

  /**
   * Get text represented by this changeset
   */
  getText() {
    if (this.hasRetained()) {
      throw new ChangesetError(
        `Unexpected cannot get text from Changeset that has retained characters: ${this.toString()}`
      );
    }

    return this.joinInsertions();
  }

  joinInsertions() {
    return this.strips
      .filter(InsertStrip.is)
      .map((strip) => (strip.outputLength > 0 ? strip.value : ''))
      .join('');
  }

  hasRetained() {
    return this.strips.some((strip) => RetainStrip.is(strip) && !strip.isEmpty());
  }

  hasOnlyInsertions() {
    return !this.hasRetained();
  }

  isText() {
    return !this.hasRetained();
  }

  isEmpty() {
    return this.strips.length === 0;
  }

  toString() {
    return toString(this);
  }

  serialize() {
    return ChangesetStruct.createRaw(this);
  }

  toJSON() {
    return this.serialize();
  }
}
