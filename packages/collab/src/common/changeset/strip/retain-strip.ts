import { RetainStripStruct, RangeStrip, RangeStripFactory } from '..';

class Factory implements RangeStripFactory<RetainStrip> {
  newInstance(start: number, end?: number): RetainStrip {
    return RetainStrip.create(start, end);
  }
  getEmpty(): RetainStrip {
    return RetainStrip.EMPTY;
  }
}

const defaultFactory = new Factory();

/**
 * Represents retained characters range in a text.
 * RetainStrip is immutable.
 */
export class RetainStrip extends RangeStrip<RetainStrip> {
  static readonly EMPTY: RetainStrip = new RetainStrip(0, 0);

  /**
   * Creates a new strip without throwing errors.
   * Returns empty strip on any invalid value.
   */
  static create: (start: number, end?: number) => RetainStrip = (start, end) => {
    start = Math.max(start, 0);

    if (end == null) {
      return new RetainStrip(start, start + 1);
    }

    if (end - start <= 0) {
      return RetainStrip.EMPTY;
    }

    return new RetainStrip(start, end);
  };

  static override is: (strip: unknown) => strip is RetainStrip = (strip) => {
    return strip instanceof RetainStrip;
  };

  get outputLength() {
    return this.length;
  }

  private constructor(start: number, end?: number) {
    super(defaultFactory, start, end);
  }

  override serialize(): unknown {
    return RetainStripStruct.createRaw(this);
  }
}
