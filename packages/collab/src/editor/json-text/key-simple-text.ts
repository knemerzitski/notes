import mitt, { Emitter, ReadEmitter } from 'mitt';

import { Logger } from '../../../../utils/src/logging';
import { isDefined } from '../../../../utils/src/type-guards/is-defined';

import { Changeset, InsertStrip, RetainStrip, Strip } from '../../changeset';
import { CollabService, CollabServiceEvents } from '../../client/collab-service';
import { SelectionRange } from '../../client/selection-range';
import {
  SelectionChangeset,
  SharedSimpleTextEvents,
  SimpleText,
  SimpleTextEvents,
  SimpleTextOperationOptions,
} from '../../types';

import { StructJsonFormatter } from './struct-json-formatter';
import { KeyViewText } from './types';

export class KeySimpleText implements SimpleText {
  private readonly logger;

  private readonly _eventBus: Emitter<SimpleTextEvents>;
  get eventBus(): ReadEmitter<SimpleTextEvents> {
    return this._eventBus;
  }

  readonly sharedEventBus: Emitter<SharedSimpleTextEvents> = mitt();

  private readonly service;

  private readonly view;
  private readonly prevView;
  private readonly getClosestOlderRevisionView;
  private readonly formatter;

  get value() {
    return this.view.value;
  }

  constructor(
    {
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
    },
    options?: {
      logger?: Logger;
    }
  ) {
    this.logger = options?.logger;

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

  serviceAppliedRedo() {
    if (this.prevView.value !== this.view.value) {
      this._eventBus.emit('appliedRedo');
    }
  }

  serviceAppliedUndo() {
    if (this.prevView.value !== this.view.value) {
      this._eventBus.emit('appliedUndo');
    }
  }

  /**
   * Transfrom selection Editor -> CollabService
   */
  transformToServiceSelection(selection: SelectionRange): SelectionRange {
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

    return selection;
  }

  /**
   * Transfrom selection CollabService -> Editor
   */
  transformToEditorSelection(selection: SelectionRange) {
    if (selection.start < this.view.jsonValueOffset) {
      return;
    }
    if (this.view.jsonValueOffset + this.view.jsonValueLength < selection.end) {
      return;
    }

    // JSON to text
    try {
      const selectionStartText = this.formatter.parseString(
        this.service.viewText.slice(this.view.jsonValueOffset, selection.start)
      );
      const selectedText = this.formatter.parseString(
        this.service.viewText.slice(selection.start, selection.end)
      );

      const start = selectionStartText.length;
      selection = {
        start,
        end: start + selectedText.length,
      };

      return selection;
    } catch (err) {
      if (err instanceof SyntaxError) {
        // Parsing viewText failed most likely due to slicing newline character in between \\n (2 chars)
        // In that case log error and return no selection.
        this.logger?.error(err, {
          viewText: this.service.viewText,
          slice: this.service.viewText.slice(this.view.jsonValueOffset, selection.start),
          args: {
            selection,
          },
        });
        return;
      }
      throw err;
    }
  }

  serviceSelectionChanged(selection: SelectionRange) {
    const editorSelection = this.transformToEditorSelection(selection);
    if (!editorSelection) {
      return;
    }

    this._eventBus.emit('selectionChanged', editorSelection);

    this.sharedEventBus.emit('selectionChanged', {
      editor: this,
      selection: editorSelection,
      source: 'mutable',
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

        let localJsonValueOffset = -1;
        const localViewComposable = Changeset.new(
          slicedViewComposable.values.map((strip) => {
            if (strip instanceof InsertStrip) {
              const parsedInsertText = this.formatter.parseString(strip.value);

              return new InsertStrip(parsedInsertText);
            } else if (strip instanceof RetainStrip) {
              const retainText = beforeView.value.slice(
                strip.startIndex,
                strip.endIndex + 1
              );
              const parsedRetainText = this.formatter.parseString(retainText);

              const offset = retainText.length - parsedRetainText.length;

              // Initialize localJsonValueOffset
              if (localJsonValueOffset === -1) {
                // Check RetainStrip from beginning to current strip (excluding start)
                const initialRetainStrip = RetainStrip.create(
                  beforeView.jsonValueOffset,
                  strip.startIndex - 1
                );
                if (initialRetainStrip instanceof RetainStrip) {
                  const firstRetainText = beforeView.value.slice(
                    initialRetainStrip.startIndex,
                    initialRetainStrip.endIndex + 1
                  );
                  const initialParsedRetainText =
                    this.formatter.parseString(firstRetainText);

                  const initialOffset =
                    firstRetainText.length - initialParsedRetainText.length;

                  localJsonValueOffset = initialOffset;
                } else {
                  localJsonValueOffset = 0;
                }
              }

              const resultStrip = RetainStrip.create(
                strip.startIndex - beforeView.jsonValueOffset - localJsonValueOffset,
                strip.endIndex -
                  (beforeView.jsonValueOffset + localJsonValueOffset + offset)
              );

              localJsonValueOffset += offset;

              return resultStrip;
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
    selection = this.transformToServiceSelection(selection);

    insertText = this.formatter.stringifyString(insertText);

    const before = RetainStrip.create(0, selection.start - 1);
    const insert = InsertStrip.create(insertText);
    const after = RetainStrip.create(selection.end, this.service.viewText.length - 1);

    const selCs: SelectionChangeset = {
      changeset: Changeset.from(before, insert, after),
      afterSelection: SelectionRange.from(selection.start + insertText.length),
      beforeSelection: selection,
    };

    this.logger?.debug('insert', {
      ...selCs,
      changeset: selCs.changeset.toString(),
    });

    this.service.pushSelectionChangeset(selCs, options);
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

    selection = this.transformToServiceSelection(selection);

    const before = RetainStrip.create(0, selection.start - 1);
    const after = RetainStrip.create(selection.end, this.service.viewText.length - 1);

    const selCs: SelectionChangeset = {
      changeset: Changeset.from(before, after),
      afterSelection: SelectionRange.from(selection.start),
      beforeSelection: selection,
    };

    this.logger?.debug('delete', {
      ...selCs,
      changeset: selCs.changeset.toString(),
    });

    this.service.pushSelectionChangeset(selCs, options);
  }
}
