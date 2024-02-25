export interface SelectionRangeProps {
  /**
   * Length is upper bound for selection range.
   */
  getLength(): number;
}

export enum SelectionDirection {
  Forward = 'forward',
  Backward = 'backward',
  None = 'none',
}

export class SelectionRange {
  private props: SelectionRangeProps;

  direction = SelectionDirection.None;

  constructor(props: SelectionRangeProps) {
    this.props = props;
  }

  private get length() {
    return this.props.getLength();
  }

  private _start = 0;
  get start() {
    return this._start;
  }
  set start(start: number) {
    this.setSelectionRange(start, Math.max(start, this._end));
  }

  private _end = 0;
  get end() {
    return this._end;
  }
  set end(end: number) {
    this.setSelectionRange(this._start, end);
  }

  /**
   * Any negative index is equal to length.
   * @param start Start index of selection.
   * @param end End index of selection.
   */
  setSelectionRange(start: number, end: number, direction = SelectionDirection.Forward) {
    this.direction = direction;

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

  selectAll() {
    this.setSelectionRange(0, this.length);
  }

  setPosition(pos = 0) {
    this.setSelectionRange(pos, pos);
  }
}
