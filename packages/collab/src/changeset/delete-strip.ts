import { Strip, RetainStrip, RangeStrip } from '.';

/**
 * Represents deleted characters range in a text.
 * Is meant to be a temporary helper for calculations.
 * Is never serialized.
 * DeleteStrip is immutable.
 */
export class DeleteStrip extends RangeStrip<DeleteStrip> {
  static create: (startIndex: number, endIndex?: number) => DeleteStrip | Strip = (
    startIndex,
    endIndex
  ) => {
    if (endIndex == null) {
      return new DeleteStrip(startIndex, startIndex);
    }

    if (endIndex < startIndex || endIndex < 0) {
      return Strip.EMPTY;
    }

    startIndex = Math.max(startIndex, 0);
    endIndex = Math.max(startIndex, endIndex);

    return new DeleteStrip(startIndex, endIndex);
  };

  static is: (strip: Strip) => strip is DeleteStrip = (strip) => {
    return strip instanceof DeleteStrip;
  };

  /**
   * DeleteStrip will not keep have characters. It's length is always 0;
   */
  override readonly length = 0;

  /**
   * How many characters are deleted;
   */
  readonly deleteLength;

  /**
   *
   * @param startIndex Start index of retained strip
   * @param endIndex Must be greater or equal to {@link startIndex}. Is inclusive
   */
  constructor(startIndex: number, endIndex: number = startIndex) {
    super(startIndex, endIndex);

    this.deleteLength = this.endIndex - this.startIndex + 1;
  }

  protected override newInstance(
    startIndex: number,
    endIndex: number = startIndex
  ): DeleteStrip {
    if (this.startIndex === startIndex && this.endIndex == endIndex) {
      return this;
    }
    return new DeleteStrip(startIndex, endIndex);
  }

  toRetainStrip(): RetainStrip {
    return new RetainStrip(this.startIndex, this.endIndex);
  }

  override serialize(): never {
    throw new Error('Do not serialize DeleteStrip');
  }
}
