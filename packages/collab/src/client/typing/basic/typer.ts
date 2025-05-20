import mitt from 'mitt';

import { Selection } from '../../../common/selection';
import { Service } from '../../service';
import {
  PublicTyperEvents,
  Typer,
  TyperBaseEvent,
  TyperEvents,
  TypingOptions,
} from '../types';

import { deletionRecord } from './delete';
import { insertionRecord } from './insert';

export class BasicTyper implements Typer {
  private readonly eventBus = mitt<TyperEvents>();
  readonly on = this.eventBus.on.bind(this.eventBus);
  readonly off = this.eventBus.off.bind(this.eventBus);

  private readonly publicEventBus = mitt<Pick<PublicTyperEvents, 'selection:changed'>>();
  readonly emit = this.publicEventBus.emit.bind(this.publicEventBus);

  private readonly disposeHandlers: () => void;

  constructor(
    private readonly service: Pick<Service, 'on' | 'viewText' | 'addLocalTyping'>
  ) {
    const offList = [
      service.on('view:changed', () => {
        this.eventBus.emit(
          'value:changed',
          this.createEvent({
            newValue: this.value,
          })
        );
      }),
      service.on('undo:applied', () => {
        this.eventBus.emit('undo:applied', this.createEvent());
      }),
      service.on('redo:applied', () => {
        this.eventBus.emit('redo:applied', this.createEvent());
      }),
      service.on('localTyping:applied', ({ typing }) => {
        this.eventBus.emit(
          'selection:changed',
          this.createEvent({
            newSelection: typing.selection,
            source: 'typing',
          })
        );
      }),
      service.on('externalTyping:applied', ({ typing }) => {
        this.eventBus.emit(
          'externalTyping:applied',
          this.createEvent({
            changeset: typing.changeset,
          })
        );
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

  get value() {
    return this.service.viewText;
  }

  private parseOptions(
    options?: TypingOptions
  ): Pick<Parameters<Service['addLocalTyping']>[0], 'history'> {
    if (!options) {
      return {};
    }

    if (options.historyType === 'permanent') {
      return {
        history: 'no',
      };
    }

    if (options.historyType === 'merge') {
      return {
        history: 'merge',
      };
    }

    return {};
  }

  insert(value: string, selection: Selection, options?: TypingOptions): void {
    this.service.addLocalTyping({
      ...insertionRecord(value, this.value, selection),
      ...this.parseOptions(options),
    });
  }

  delete(count: number, selection: Selection, options?: TypingOptions): void {
    this.service.addLocalTyping({
      ...deletionRecord(count, this.value, selection),
      ...this.parseOptions(options),
    });
  }

  toTyperSelection(selection: Selection): Selection {
    return selection;
  }

  toServiceSelection(selection: Selection): Selection {
    return selection;
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
