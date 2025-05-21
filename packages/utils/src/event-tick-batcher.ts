import { createDeferred, Deferred } from './deferred';

/**
 *
 * Batches all `load` calls in the same event loop and invokes them at once.
 */
export class EventTickBatcher<K, V> {
  private deferredByKey = new Map<K, Deferred<V>>();
  private promise: Promise<void> | null = null;

  constructor(
    private readonly loadFn: (keys: readonly K[]) => Promise<readonly (V | Error)[]>
  ) {}

  async load(key: K): Promise<V> {
    const deferred = this.getDeferred(key);

    this.queueToMicroTasks();

    return deferred.promise;
  }

  private queueToMicroTasks() {
    if (this.promise) {
      return;
    }

    this.promise = Promise.resolve().then(() => {
      this.promise = null;
      const entries = [...this.deferredByKey.entries()];
      this.deferredByKey.clear();
      void this.runLoadFnWithEntries(entries);
    });
  }

  private async runLoadFnWithEntries(entries: [K, Deferred<V>][]) {
    try {
      const keys = entries.map(([key]) => key);

      const results = await this.loadFn(keys);

      for (let i = 0; i < entries.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const entry = entries[i]!;
        const deferred = entry[1];
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const result = results[i]!;
        if (result instanceof Error) {
          deferred.reject(result);
        } else {
          deferred.resolve(result);
        }
      }
    } catch (err) {
      for (const entry of entries) {
        entry[1].reject(err);
      }
    }
  }

  private getDeferred(key: K) {
    let deferred = this.deferredByKey.get(key);
    if (!deferred) {
      deferred = createDeferred<V>();
      this.deferredByKey.set(key, deferred);
    }

    return deferred;
  }
}
