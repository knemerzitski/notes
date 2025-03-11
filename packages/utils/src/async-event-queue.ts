import { createDeferred, Deferred } from './deferred';

export type Listener<T> = (event: T) => void;

export type ListenerEvent<T> = T extends Listener<infer U> ? U : never;

export class AsyncEventQueue<T> {
  private nextDeferred: Deferred<T> | null = null;
  private queue: T[] = [];

  private listeners = new Set<Listener<T>>();

  constructor() {
    this.listeners.add((event) => {
      if (this.nextDeferred != null) {
        this.nextDeferred.resolve(event);
        this.nextDeferred = null;
      } else {
        this.queue.push(event);
      }
    });
  }

  next(event: T) {
    this.listeners.forEach((listener) => {
      listener(event);
    });
  }

  getNext(): Promise<T> {
    const event = this.queue.shift();
    if (event !== undefined) {
      return Promise.resolve(event);
    }

    this.nextDeferred = this.nextDeferred ?? createDeferred();
    return this.nextDeferred.promise;
  }

  onNext(
    listener: Listener<T>,
    options?: {
      consume?: boolean;
    }
  ) {
    this.listeners.add(listener);
    if (options?.consume) {
      this.queue.forEach(listener);
      this.queue.length = 0;
    }
  }
}
