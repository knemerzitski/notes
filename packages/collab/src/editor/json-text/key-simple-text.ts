import mitt, { Emitter } from 'mitt';
import { isDefined } from '~utils/type-guards/is-defined';
import { Changeset, InsertStrip, RetainStrip, Strip } from '../../changeset';
import { CollabService, CollabServiceEvents } from '../../client/collab-service';
import { SelectionRange } from '../../client/selection-range';
import { SimpleText, SimpleTextEvents, SimpleTextOperationOptions } from '../types';
import { StructJsonFormatter } from './struct-json-formatter';
import { KeyViewText } from './types';

export class KeySimpleText implements SimpleText {
  private readonly _eventBus: Emitter<SimpleTextEvents>;
  get eventBus(): Pick<Emitter<SimpleTextEvents>, 'on' | 'off'> {
    return this._eventBus;
  }

  private readonly service;

  private readonly view;
  private readonly prevView;
  private readonly getClosestOlderRevisionView;
  private readonly formatter;

  get value() {
    return this.view.value;
  }

  constructor({
    service,
    view,
    prevView,
    getClosestOlderRevisionView,
    formatter,
  }: {
    service: {
      viewText: CollabService['viewText'];
      pushSelectionChangeset: CollabService['pushSelectionChangeset'];
    };
    view: KeyViewText;
    prevView: KeyViewText;
    getClosestOlderRevisionView: (revision: number) => KeyViewText | undefined;
    formatter: StructJsonFormatter;
  }) {
    this.service = service;

    this.view = view;
    this.prevView = prevView;
    this.getClosestOlderRevisionView = getClosestOlderRevisionView;

    this.formatter = formatter;

    this._eventBus = mitt();
  }

  serviceViewChanged() {
    if (this.prevView.value !== this.view.value) {
      this._eventBus.emit('valueChanged', this.view.value);
    }
  }

  serviceSelectionChanged(selection: SelectionRange) {
    if (selection.start < this.view.jsonValueOffset) {
      return;
    }
    if (this.view.jsonValueOffset + this.view.jsonValueLength < selection.end) {
      return;
    }

    // JSON to text
    const selectionStartText = this.formatter.parseString(
      this.service.viewText.slice(this.view.jsonValueOffset, selection.start)
    );
    const selectedText = this.formatter.parseString(
      this.service.viewText.slice(selection.start, selection.end)
    );

    const start = selectionStartText.length;
    this._eventBus.emit('selectionChanged', {
      start,
      end: start + selectedText.length,
    });
  }

  serviceHandledExternalChange(payload: CollabServiceEvents['handledExternalChanges']) {
    const haveEvents =
      !!this._eventBus.all.get('handledExternalChanges')?.length ||
      !!this._eventBus.all.get('*')?.length;
    if (!haveEvents) {
      return;
    }

    const transformedEvents = payload
      .map(({ revision, event }) => {
        const beforeView = this.getClosestOlderRevisionView(revision);
        if (!beforeView) {
          return;
        }

        const slicedViewComposable = event.viewComposable.strips
          .sliceByRetain(
            beforeView.jsonValueOffset - 1,
            beforeView.jsonValueOffset + beforeView.jsonValueLength + 1
          )
          .shrink(1, 1);

        const localViewComposable = new Changeset(
          slicedViewComposable.values.map((strip) => {
            if (strip instanceof InsertStrip) {
              return new InsertStrip(this.formatter.parseString(strip.value));
            } else if (strip instanceof RetainStrip) {
              const retainText = beforeView.value.slice(
                strip.startIndex,
                strip.endIndex + 1
              );
              const parsedRetainText = this.formatter.parseString(retainText);

              return RetainStrip.create(
                strip.startIndex - beforeView.jsonValueOffset,
                strip.endIndex -
                  beforeView.jsonValueOffset -
                  (retainText.length - parsedRetainText.length)
              );
            }
            return Strip.EMPTY;
          })
        );

        if (localViewComposable.length > 0) {
          return { changeset: localViewComposable, revision };
        }
        return;
      })
      .filter(isDefined);

    if (transformedEvents.length === 0) {
      return;
    }

    this._eventBus.emit('handledExternalChanges', transformedEvents);
  }

  insert(
    insertText: string,
    selection: SelectionRange,
    options?: SimpleTextOperationOptions
  ): void {
    // Text to JSON
    const selectionStartJson = this.formatter.stringifyString(
      this.view.value.slice(0, selection.start)
    );
    const selectedJson = this.formatter.stringifyString(
      this.view.value.slice(selection.start, selection.end)
    );

    selection = SelectionRange.clamp(selection, this.view.value.length);
    const start = this.view.jsonValueOffset + selectionStartJson.length;
    selection = {
      start,
      end: start + selectedJson.length,
    };
    selection = SelectionRange.clamp(selection, this.service.viewText.length);

    insertText = this.formatter.stringifyString(insertText);

    const before = RetainStrip.create(0, selection.start - 1);
    const insert = InsertStrip.create(insertText);
    const after = RetainStrip.create(selection.end, this.service.viewText.length - 1);

    this.service.pushSelectionChangeset(
      {
        changeset: Changeset.from(before, insert, after),
        afterSelection: SelectionRange.from(selection.start + insertText.length),
        beforeSelection: selection,
      },
      options
    );
  }

  delete(count = 1, selection: SelectionRange, options?: SimpleTextOperationOptions) {
    if (count <= 0) {
      return;
    }
    selection = SelectionRange.clamp(selection, this.view.value.length);
    selection.start = Math.max(
      0,
      selection.start - (count - (selection.start !== selection.end ? 1 : 0))
    );

    // Text to JSON
    const selectionStartJson = this.formatter.stringifyString(
      this.view.value.slice(0, selection.start)
    );
    const selectedJson = this.formatter.stringifyString(
      this.view.value.slice(selection.start, selection.end)
    );

    selection = SelectionRange.clamp(selection, this.view.value.length);
    const start = this.view.jsonValueOffset + selectionStartJson.length;
    selection = {
      start,
      end: start + selectedJson.length,
    };
    selection = SelectionRange.clamp(selection, this.service.viewText.length);

    const before = RetainStrip.create(0, selection.start - 1);
    const after = RetainStrip.create(selection.end, this.service.viewText.length - 1);

    this.service.pushSelectionChangeset(
      {
        changeset: Changeset.from(before, after),
        afterSelection: SelectionRange.from(selection.start),
        beforeSelection: selection,
      },
      options
    );
  }
}
