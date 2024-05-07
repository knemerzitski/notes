import mitt, { Emitter } from "~utils/mitt-unsub";
import { Changeset } from "../../changeset/changeset";
import { SelectionRange } from "../../client/selection-range";
import { CollabEditor } from "../../client/collab-editor";

/**
 * Make sure to call cleanUp after you're done using the SelectionRange.
 */
export function newSelectionRange(editor: CollabEditor) {
  const selectionRange = new CollabEditorSelectionRange({
    getLength: () => {
      return editor.viewText.length;
    },
  });
  const subscriptions = [
    editor.eventBus.on('handledExternalChange', ({ viewComposable }) => {
      selectionRange.followChangeset(viewComposable);
    }),
    editor.eventBus.on('appliedTypingOperation', ({ operation }) => {
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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CollabEditorSelectionRangeEvents = {
  selectionChanged: {
    newSelection: Readonly<SelectionRange>;
  };
};



interface CollabEditorSelectionRangeOptions {
  /**
   * Length is upper bound for selection range.
   */
  getLength(): number;
  eventBus?: Emitter<CollabEditorSelectionRangeEvents>;
}

class CollabEditorSelectionRange implements SelectionRange {
  readonly eventBus: Emitter<CollabEditorSelectionRangeEvents>;

  private props: CollabEditorSelectionRangeOptions;

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

  constructor(props: CollabEditorSelectionRangeOptions) {
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

  followChangeset(changeset: Changeset) {
    const newSelection = SelectionRange.followChangeset(this, changeset);
    this._start = newSelection.start;
    this._end = newSelection.end;
  }
}