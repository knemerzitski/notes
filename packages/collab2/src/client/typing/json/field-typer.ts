import mitt from 'mitt';

import { Logger } from '../../../../../utils/src/logging';

import { Changeset, InsertStrip, RetainStrip } from '../../../common/changeset';
import { Selection } from '../../../common/selection';
import {
  PublicTyperEvents,
  Typer,
  TyperBaseEvent,
  TyperEvents,
  TypingOptions,
} from '../types';

import { JsonServiceError } from './errors';
import { Service } from './service';

import { toFieldChangeset } from './utils/to-field-changeset';

export class FieldTyper<T extends string> implements Typer {
  private readonly eventBus = mitt<TyperEvents>();
  readonly on = this.eventBus.on.bind(this.eventBus);
  readonly off = this.eventBus.off.bind(this.eventBus);

  private readonly publicEventBus = mitt<Pick<PublicTyperEvents, 'selection:changed'>>();
  readonly emit = this.publicEventBus.emit.bind(this.publicEventBus);

  get value() {
    return this.getFieldText().value;
  }

  private readonly disposeHandlers: () => void;

  constructor(
    private readonly ctx: {
      readonly name: T;
      readonly service: Pick<
        Service<T>,
        'on' | 'getFieldText' | 'textParser' | 'getViewText' | 'addLocalTyping'
      >;
      readonly logger?: Logger;
    }
  ) {
    const offList = [
      this.publicEventBus.on('selection:changed', ({ newSelection }) => {
        this.eventBus.emit(
          'selection:changed',
          this.createEvent({
            newSelection,
            source: 'movement',
          })
        );
      }),
      this.service.on('view:changed', ({ change: { viewRevision } }) => {
        const prevValue = this.getFieldText(viewRevision - 1).value;
        const newValue = this.getFieldText(viewRevision).value;
        if (prevValue !== newValue) {
          this.eventBus.emit(
            'value:changed',
            this.createEvent({
              newValue,
            })
          );
        }
      }),

      this.service.on('undo:applied', ({ typing: { viewRevision } }) => {
        const prevValue = this.getFieldText(viewRevision - 1).value;
        const newValue = this.getFieldText(viewRevision).value;
        if (prevValue !== newValue) {
          this.eventBus.emit('undo:applied', this.createEvent());
        }
      }),

      this.service.on('redo:applied', ({ typing: { viewRevision } }) => {
        const prevValue = this.getFieldText(viewRevision - 1).value;
        const newValue = this.getFieldText(viewRevision).value;
        if (prevValue !== newValue) {
          this.eventBus.emit('redo:applied', this.createEvent());
        }
      }),

      this.service.on('localTyping:applied', ({ typing: { selection } }) => {
        const typerSelection = this.toTyperSelection(selection);
        if (!typerSelection) {
          return;
        }

        this.eventBus.emit(
          'selection:changed',
          this.createEvent({
            newSelection: typerSelection,
            source: 'typing',
          })
        );
      }),

      this.service.on('externalTyping:applied', ({ typing }) => {
        const haveListeners =
          !!this.eventBus.all.get('externalTyping:applied')?.length ||
          !!this.eventBus.all.get('*')?.length;
        if (!haveListeners) {
          return;
        }

        const prevViewText = this.getViewText(typing.viewRevision - 1);
        const prevFieldText = this.getFieldText(typing.viewRevision - 1);
        const fieldText = this.getFieldText(typing.viewRevision);
        if (!prevFieldText.metadata || !fieldText.metadata) {
          return;
        }

        const fieldChangeset = toFieldChangeset(
          typing.changeset,
          prevViewText,
          prevFieldText.value,
          prevFieldText.metadata,
          fieldText.metadata,
          this.textParser
        );

        if (!Changeset.isNoOp(Changeset.fromText(prevFieldText.value), fieldChangeset)) {
          this.eventBus.emit(
            'externalTyping:applied',
            this.createEvent({
              changeset: fieldChangeset,
            })
          );
        }
      }),
    ];

    this.disposeHandlers = () => {
      offList.forEach((off) => {
        off();
      });
    };
  }

  dispose() {
    this.disposeHandlers();
  }

  private get name() {
    return this.ctx.name;
  }

  private get logger() {
    return this.ctx.logger;
  }

  private get service() {
    return this.ctx.service;
  }

  private getViewText(viewRevision?: number) {
    return this.service.getViewText(viewRevision).getText();
  }

  private getFieldText(viewRevision?: number) {
    return this.service.getFieldText(this.name, viewRevision);
  }

  private get textParser() {
    return this.service.textParser;
  }

  private parseOptions(
    options?: TypingOptions
  ): Pick<Parameters<(typeof this.service)['addLocalTyping']>[0], 'history'> {
    return {
      history: options?.historyType === 'permanent' ? 'no' : options?.historyType,
    };
  }

  insert(value: string, typerSelection: Selection, options?: TypingOptions): void {
    const viewText = this.getViewText();

    const selection = this.toServiceSelection(typerSelection);
    if (!selection) {
      throw new JsonServiceError(
        `Unexpected missing selection to insert text in field ${this.name}`
      );
    }

    value = this.textParser.stringifyString(value);

    this.service.addLocalTyping({
      ...this.parseOptions(options),
      changeset: Changeset.create(viewText.length, [
        RetainStrip.create(0, selection.start),
        InsertStrip.create(value),
        RetainStrip.create(selection.end, viewText.length),
      ]),
      selectionInverse: selection,
      selection: Selection.create(selection.start + value.length),
    });
  }

  delete(count: number, typerSelection: Selection, options?: TypingOptions): void {
    const viewText = this.getViewText();
    const fieldText = this.getFieldText();

    if (count <= 0) {
      return;
    }

    typerSelection = typerSelection.clamp(fieldText.value.length);
    if (typerSelection.start !== typerSelection.end) {
      count--;
    }
    count = Math.max(0, count);
    const typerDeleteSelection = Selection.create(
      Math.max(typerSelection.start - count, 0),
      typerSelection.end
    );

    const selection = this.toServiceSelection(typerSelection);
    const deleteSelection = this.toServiceSelection(typerDeleteSelection);

    if (!deleteSelection || !selection) {
      throw new JsonServiceError(
        `Unexpected missing selection to delete text in field ${this.name}`
      );
    }

    this.service.addLocalTyping({
      ...this.parseOptions(options),
      changeset: Changeset.create(viewText.length, [
        RetainStrip.create(0, deleteSelection.start),
        RetainStrip.create(deleteSelection.end, viewText.length),
      ]),
      selectionInverse: selection,
      selection: Selection.create(deleteSelection.start),
    });
  }

  toTyperSelection(selection: Selection): Selection | undefined {
    const viewText = this.getViewText();
    const fieldText = this.getFieldText();
    if (
      !fieldText.metadata ||
      selection.start < fieldText.metadata.start ||
      fieldText.metadata.end < selection.end
    ) {
      return;
    }

    try {
      const startString = this.textParser.parseString(
        viewText.slice(fieldText.metadata.start, selection.start)
      );
      const selectedString = this.textParser.parseString(
        viewText.slice(selection.start, selection.end)
      );

      const start = startString.length;
      return Selection.create(start, start + selectedString.length);
    } catch (err) {
      if (err instanceof SyntaxError) {
        // parseString fails when slicing between newline character \\n (2 chars)
        // In that case log error and return no selection.
        this.logger?.error(err, {
          viewText,
          slice: viewText.slice(fieldText.metadata.start, selection.start),
          selection,
        });
        return;
      }

      throw err;
    }
  }

  toServiceSelection(typerSelection: Selection): Selection | undefined {
    const viewText = this.getViewText();
    const fieldText = this.getFieldText();
    if (!fieldText.metadata) {
      return;
    }

    const startString = this.textParser.stringifyString(
      fieldText.value.slice(0, typerSelection.start)
    );
    const selectedString = this.textParser.stringifyString(
      fieldText.value.slice(typerSelection.start, typerSelection.end)
    );

    const start = fieldText.metadata.start + startString.length;
    return Selection.create(start, start + selectedString.length).clamp(viewText.length);
  }

  private createEvent(): TyperBaseEvent;
  private createEvent<T>(event: T): T & TyperBaseEvent;
  private createEvent<T>(event?: T): TyperBaseEvent | (T & TyperBaseEvent) {
    return {
      typer: this,
      ...event,
    };
  }
}
