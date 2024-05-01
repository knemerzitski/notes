import { Changeset } from '../changeset/changeset';

export interface SelectionRangeProps {
  start?: number | null;
  end?: number | null;
  /**
   * Length is upper bound for selection range.
   */
  getLength: () => number;
}

export class SelectionRange {
  private _start = 0;
  get start() {
    return this._start;
  }
  set start(start: number) {
    this.set(start, Math.max(start, this._end));
  }

  private _end = 0;
  get end() {
    return this._end;
  }
  set end(end: number) {
    this.set(this._start, end);
  }

  private getLength: () => number;
  private get length() {
    return this.getLength();
  }

  constructor(options: SelectionRangeProps) {
    this.getLength = options.getLength;
    this.set(options.start ?? 0, options.end ?? options.start ?? 0);
  }

  /**
   * Any negative index is equal to length.
   * @param start Start index of selection.
   * @param end End index of selection.
   */
  set(start: number, end: number = start) {
    if (start < 0) {
      start = this.length;
    }
    if (end < 0) {
      end = this.length;
    }

    if (end < start) {
      start = end;
    }

    this._start = Math.max(0, Math.min(start, this.length));
    this._end = Math.max(0, Math.min(end, this.length));
  }

  setFrom(other: SelectionRange) {
    this.set(other.start, other.end);
  }

  selectAll() {
    this.set(0, this.length);
  }

  followChangeset(changeset: Changeset) {
    this.set(changeset.followIndex(this.start), changeset.followIndex(this.end));
  }

  serialize() {
    return {
      start: this.start,
      end: this.end,
    };
  }
}
