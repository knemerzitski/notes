import mitt from 'mitt';

import { Debounce } from '../../../../utils/src/debounce';

import {
  Persistor,
  PersistorEvents,
  Serializable,
  Store,
  StoreSetBuffer,
} from '../types';

export class DebounceSetManyStoreBuffer implements StoreSetBuffer, Persistor {
  private readonly eventBus = mitt<PersistorEvents>();
  readonly on = this.eventBus.on.bind(this.eventBus);
  readonly off = this.eventBus.off.bind(this.eventBus);

  readonly buffer = new Map<string, Serializable>();
  private readonly debounce;

  private readonly ongoingPromises = new Set<Promise<void>>();

  private prevIsPending: boolean | null = null;

  constructor(
    private readonly store: Pick<Store, 'setMany'>,
    options: ConstructorParameters<typeof Debounce>[1]
  ) {
    this.debounce = new Debounce(this.callback.bind(this), options);
  }

  isPending(): boolean {
    return this.debounce.isPending() || this.ongoingPromises.size > 0;
  }

  async flush(): Promise<void> {
    if (!this.isPending()) {
      return;
    }
    this.debounce.flush();

    await Promise.all(this.ongoingPromises);

    return this.flush();
  }

  private emitIsPending() {
    const isPending = this.isPending();
    if (this.prevIsPending === isPending) {
      return;
    }
    this.prevIsPending = isPending;

    this.eventBus.emit('isPending', isPending);
  }

  has(key: string): boolean {
    return this.buffer.has(key);
  }

  set(key: string, value: Serializable): void {
    this.buffer.set(key, value);
    this.debounce.invoke();
    this.emitIsPending();
  }

  remove(key: string): void {
    this.buffer.delete(key);
    if (this.buffer.size === 0) {
      this.debounce.cancel();
      this.emitIsPending();
    }
  }

  private callback() {
    const data = [...this.buffer.entries()].map(
      ([key, serializable]) => [key, serializable.serialize()] satisfies [string, unknown]
    );
    if (data.length === 0) {
      return;
    }

    const promise = this.store.setMany(data).then(() => {
      this.buffer.clear();
    });
    this.ongoingPromises.add(promise);
    this.emitIsPending();
    void promise.finally(() => {
      this.ongoingPromises.delete(promise);
      this.emitIsPending();
    });
  }
}
