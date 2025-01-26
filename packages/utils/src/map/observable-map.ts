import { Observable, SubscriptionObserver } from 'zen-observable-ts';

type Event<K, V> =
  | { type: 'set'; key: K; value: V }
  | {
      type: 'delete';
      key: K;
      deletedValue: V | undefined;
    };

export class ObservableMap<K, V> {
  private observers = new Set<SubscriptionObserver<Event<K, V>>>();

  readonly observable = new Observable<Event<K, V>>((observer) => {
    this.observers.add(observer);
    return () => {
      this.observers.delete(observer);
    };
  });

  constructor(private readonly map: Pick<Map<K, V>, 'set' | 'delete' | 'get'>) {}

  set(key: K, value: V): Map<K, V> {
    const changed = this.get(key) !== value;

    const result = this.map.set(key, value);

    if (changed) {
      this.observers.forEach((observer) => {
        observer.next({ type: 'set', key, value });
      });
    }

    return result;
  }

  delete(key: K) {
    const deleteValue = this.map.get(key);

    const result = this.map.delete(key);

    if (result) {
      this.observers.forEach((observer) => {
        observer.next({ type: 'delete', key, deletedValue: deleteValue });
      });
    }

    return result;
  }

  get(key: K) {
    return this.map.get(key);
  }
}
