import { EMPTY_ARRAY } from '../../../../../utils/src/array/empty';

import { Changeset, RangeStrip, RangeStripFactory, Strip } from '..';

class Factory implements RangeStripFactory<RemoveStrip> {
  newInstance(start: number, end?: number): RemoveStrip {
    return RemoveStrip.create(start, end);
  }
  getEmpty(): RemoveStrip {
    return RemoveStrip.EMPTY;
  }
}

const defaultFactory = new Factory();

/**
 * Represents retained characters range in a text.
 * RetainStrip is immutable.
 */
export class RemoveStrip extends RangeStrip<RemoveStrip> {
  static readonly EMPTY: RemoveStrip = new RemoveStrip(0, 0);

  /**
   * Creates a new strip without throwing errors.
   * Returns empty strip on any invalid value.
   */
  static create: (start: number, end?: number) => RemoveStrip = (start, end) => {
    start = Math.max(start, 0);

    if (end == null) {
      return new RemoveStrip(start, start + 1);
    }

    if (end - start <= 0) {
      return RemoveStrip.EMPTY;
    }

    return new RemoveStrip(start, end);
  };

  static override is: (strip: unknown) => strip is RemoveStrip = (strip) => {
    return strip instanceof RemoveStrip;
  };

  override outputLength = 0;

  private constructor(start: number, end?: number) {
    super(defaultFactory, start, end);
  }

  override reference(_changeset: Changeset): readonly Strip[] {
    return EMPTY_ARRAY;
  }

  override serialize(): unknown {
    return;
  }

  override toString(): string {
    if (this.length > 1) {
      return `-(${super.toString()})`;
    }
    return `-${super.toString()}`;
  }
}
