import { Selection } from '../../../common/selection';
import { Service } from '../../service/service';

export class BasicSelection {
  private _selection = Selection.ZERO;

  private readonly off: () => void;

  constructor(private readonly service: Pick<Service, 'on' | 'viewText'>) {
    const offList = [
      service.on('localTyping:applied', ({ typing }) => {
        this._selection = typing.selection;
      }),
      // Adjust selection to external typing
      service.on('externalTyping:applied', ({ typing }) => {
        this._selection = this._selection.follow(typing.changeset, true);
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

    this._selection = this._selection.clamp(this.service.viewText.length);
  }
}
