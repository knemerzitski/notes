import { Selection } from '../../../common/selection';
import { Selector, Typer, TypingOptions } from '../types';

export class ControlledTyper {
  constructor(
    readonly typer: Typer,
    readonly selector: Selector
  ) {}

  get value() {
    return this.typer.value;
  }

  get caret() {
    return this.selector.value;
  }

  insert(value: string, options?: TypingOptions) {
    this.typer.insert(value, this.selector.value, options);
  }

  delete(count = 1, options?: TypingOptions) {
    this.typer.delete(count, this.selector.value, options);
  }

  setCaret(selection: Selection): void;
  setCaret(start: number, end?: number): void;
  setCaret(start: Selection | number, end?: number): void {
    if (Selection.is(start)) {
      this.selector.set(start);
    } else {
      this.selector.set(start, end);
    }
  }
}
