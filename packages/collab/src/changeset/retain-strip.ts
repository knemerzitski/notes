import { Strip, RetainStripStruct, DeleteStrip, RangeStrip } from '.';

/**
 * Represents retained characters range in a text.
 * RetainStrip is immutable.
 */
export class RetainStrip extends RangeStrip<RetainStrip> {
  /**
   * Creates a new strip without throwing errors.
   * Returns empty strip on any invalid value.
   */
  static create: (
    startIndex: number,
    endIndex?: number
  ) => RetainStrip | typeof Strip.EMPTY = (startIndex, endIndex) => {
    if (endIndex == null) {
      return new RetainStrip(startIndex, startIndex);
    }

    if (endIndex < startIndex || endIndex < 0) {
      return Strip.EMPTY;
    }

    startIndex = Math.max(startIndex, 0);
    endIndex = Math.max(startIndex, endIndex);

    return new RetainStrip(startIndex, endIndex);
  };

  static is: (strip: Strip) => strip is RetainStrip = (strip) => {
    return strip instanceof RetainStrip;
  };

  protected override newInstance(startIndex: number, endIndex: number = startIndex) {
    if (this.startIndex === startIndex && this.endIndex == endIndex) {
      return this;
    }
    return new RetainStrip(startIndex, endIndex);
  }

  toDeleteStrip() {
    return new DeleteStrip(this.startIndex, this.endIndex);
  }

  serialize() {
    return RetainStripStruct.createRaw(this);
  }

  static override parseValue: (value: unknown) => RetainStrip = (value) => {
    return RetainStripStruct.create(value);
  };
}
