import { Selection } from '../../../common/selection';
import { Selector, Typer } from '../types';

export class BasicSelection implements Selector {
  private _selection = Selection.ZERO;

  private readonly off: () => void;

  constructor(private readonly typer: Typer) {
    const offList = [
      typer.on('selection:changed', ({ newSelection }) => {
        this._selection = newSelection;
      }),
      // Adjust selection to external typing
      typer.on('externalTyping:applied', ({ changeset }) => {
        this._selection = this._selection.follow(changeset, true);
      }),
    ];

    this.off = () => {
      offList.forEach((off) => {
        off();
      });
    };
  }

  get value() {
    return this._selection;
  }

  dispose() {
    this.off();
  }

  set(selection: Selection): void;
  set(start: number, end?: number): void;
  set(start: Selection | number, end?: number): void {
    if (Selection.is(start)) {
      this._selection = Selection.create(start);
    } else {
      this._selection = Selection.create(start, end);
    }

    this._selection = this._selection.clamp(this.typer.value.length);
  }
}
