import { Changeset } from '../changeset';

import { SelectionStruct } from '.';

/**
 * Represents any kind of a selection between indices.
 */
export class Selection {
  static parse: (value: unknown) => Selection = (value: unknown) =>
    SelectionStruct.create(value);

  static readonly ZERO = new Selection(0);

  static create: ((selection: Selection) => Selection) &
    ((start: number, end?: number) => Selection) = (
    start: number | Selection,
    end?: number
  ) => {
    if (typeof start === 'number') {
      if (start === 0 && start === end) {
        return Selection.ZERO;
      }

      return new Selection(start, end);
    }

    return start;
  };

  static is: (selection: unknown) => selection is Selection = (strip) => {
    return strip instanceof Selection;
  };

  /**
   * @param start Range start index
   * @param end Must be greator or equal to {@link start}. Is exclusive
   */
  protected constructor(
    /**
     * The start index to the beginning.
     */
    readonly start: number,
    /**
     * The index to the end. Is exclusive and can match length.
     */
    readonly end = start
  ) {}

  isCollapsed() {
    return this.start == this.end;
  }

  isExpanded() {
    return !this.isCollapsed();
  }

  /**
   *
   * @param left On insertion stick to left side or right side on false
   * @returns
   */
  follow(changeset: Changeset, left: boolean): Selection {
    if (this.isCollapsed()) {
      return Selection.create(Changeset.followPosition(this.start, changeset, left));
    }

    return Selection.create(
      Changeset.followPosition(this.start, changeset, left),
      Changeset.followPosition(this.end, changeset, left)
    );
  }

  add(sel: Selection | number): Selection {
    if (Selection.is(sel)) {
      return Selection.create(this.start + sel.start, this.end + sel.end);
    }

    return this.add(Selection.create(sel));
  }

  subtract(sel: Selection | number): Selection {
    if (Selection.is(sel)) {
      return this.add(sel.negative());
    }

    return this.subtract(Selection.create(sel));
  }

  negative(): Selection {
    return Selection.create(-this.start, -this.end);
  }

  /**
   * Clamp selection between [0,length). Negative values count as at end of length
   */
  clamp(length: number): Selection {
    let start = this.start;
    let end = this.end;

    if (start < 0) {
      start = length;
    }
    if (end < 0) {
      end = length;
    }
    if (end < start) {
      start = end;
    }

    start = Math.max(0, Math.min(start, length));
    end = Math.max(0, Math.min(end, length));

    return Selection.create(start, end);
  }

  isEqual(other: Selection) {
    return this.start === other.start && this.end == other.end;
  }

  toString() {
    if (this.start === this.end) {
      return String(this.start);
    }

    return `${this.start}:${this.end}`;
  }

  serialize() {
    return SelectionStruct.createRaw(this);
  }

  toJSON() {
    return this.serialize();
  }
}
