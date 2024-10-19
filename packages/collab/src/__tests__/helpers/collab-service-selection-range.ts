import mitt, { Emitter } from 'mitt';

import { CollabService } from '../../client/collab-service';
import { Changeset } from '../../changeset';
import { SelectionRange } from '../../client/selection-range';
import { ReadonlyDeep } from '~utils/types';

/**
 * Make sure to call cleanUp after you're done using the SelectionRange.
 */
export function newSelectionRange(service: CollabService) {
  const selectionRange = new CollabServiceSelectionRange({
    getLength: () => {
      return service.viewText.length;
    },
  });
  const subscriptions = [
    service.eventBus.on('handledExternalChange', ({ viewComposable }) => {
      selectionRange.closestRetainedPosition(viewComposable);
    }),
    service.eventBus.on('appliedTypingOperation', ({ operation }) => {
      selectionRange.set(operation.selection);
    }),
  ];

  return {
    selectionRange,
    cleanUp: () => {
      subscriptions.forEach((unsubscribe) => {
        unsubscribe();
      });
    },
  };
}

interface CollabServiceSelectionRangeEvents {
  selectionChanged: ReadonlyDeep<{
    newSelection: SelectionRange;
  }>;
}

export interface CollabServiceSelectionRangeOptions {
  /**
   * Length is upper bound for selection range.
   */
  getLength(): number;
  eventBus?: Emitter<CollabServiceSelectionRangeEvents>;
}

export class CollabServiceSelectionRange implements SelectionRange {
  readonly eventBus: Emitter<CollabServiceSelectionRangeEvents>;

  private props: CollabServiceSelectionRangeOptions;

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

  private get length() {
    return this.props.getLength();
  }

  constructor(props: CollabServiceSelectionRangeOptions) {
    this.props = props;

    this.eventBus = props.eventBus ?? mitt();
  }

  set(start: number, end?: number): void;
  set(selection: SelectionRange): void;
  /**
   * Any negative index is equal to length.
   * @param start Start index of selection.
   * @param end End index of selection.
   */
  set(selection: SelectionRange | number, end?: number) {
    let newSelection: SelectionRange;
    if (typeof selection === 'number') {
      newSelection = SelectionRange.clamp(
        { start: selection, end: end ?? selection },
        this.length
      );
    } else {
      newSelection = SelectionRange.clamp(selection, this.length);
    }
    this._start = newSelection.start;
    this._end = newSelection.end;

    this.eventBus.emit('selectionChanged', {
      newSelection,
    });
  }

  closestRetainedPosition(changeset: Changeset) {
    const newSelection = SelectionRange.closestRetainedPosition(this, changeset);
    this._start = newSelection.start;
    this._end = newSelection.end;
  }
}
