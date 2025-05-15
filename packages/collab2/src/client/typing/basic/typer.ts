import mitt from 'mitt';
import { Selection } from '../../../common/selection';
import { Service } from '../../service';
import { PublicTyperEvents, Typer, TyperEvents, TypingOptions } from '../types';
import { deletionRecord } from './delete';
import { insertionRecord } from './insert';

export class BasicTyper implements Typer {
  // TODO events not implemented
  private readonly eventBus = mitt<TyperEvents>();
  readonly on = this.eventBus.on.bind(this.eventBus);
  readonly off = this.eventBus.off.bind(this.eventBus);

  private readonly publicEventBus = mitt<Pick<PublicTyperEvents, 'selection:changed'>>();
  readonly emit = this.publicEventBus.emit.bind(this.publicEventBus);

  constructor(private readonly service: Pick<Service, 'viewText' | 'addLocalTyping'>) {}

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
}
