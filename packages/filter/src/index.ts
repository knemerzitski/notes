/**
 * A simple filter pattern. An alternative over method overloading for
 * separation of concern.
 */

export type FilterName = string | symbol;

export type Handler<T = unknown> = (value: T) => T;

export type FilterHandlerList<T = unknown> = Handler<T>[];
export type FiltersHandlerMap<T extends Record<FilterName, unknown>> = Map<
  keyof T,
  FilterHandlerList<T[keyof T]>
>;

export interface Filter<T extends Record<FilterName, unknown>> {
  all: FiltersHandlerMap<T>;
  on<Key extends keyof T>(type: Key, handler: Handler<T[Key]>): () => void;
  off<Key extends keyof T>(type: Key, handler?: Handler<T[Key]>): void;
  filter<Key extends keyof T>(type: Key, value: T[Key]): T[Key];
}

class BasicFilter<T extends Record<FilterName, unknown>> implements Filter<T> {
  all: FiltersHandlerMap<T>;

  constructor(all?: FiltersHandlerMap<T>) {
    this.all = all ?? new Map<keyof T, FilterHandlerList<T[keyof T]>>();
  }

  on<Key extends keyof T>(type: Key, handler: Handler<T[Key]>): () => void {
    const handlers = this.all.get(type);
    if (handlers) {
      handlers.push(handler as unknown as Handler<T[keyof T]>);
    } else {
      this.all.set(type, [handler as unknown as Handler<T[keyof T]>]);
    }

    return () => {
      this.off(type, handler);
    };
  }

  off<Key extends keyof T>(type: Key, handler?: Handler<T[Key]> | undefined): void {
    const handlers = this.all.get(type);
    if (handlers) {
      if (handler) {
        const index = handlers.indexOf(handler as unknown as Handler<T[keyof T]>);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      } else {
        this.all.set(type, []);
      }
    }
  }

  filter<Key extends keyof T>(type: Key, value: T[Key]): T[Key] {
    const handlers = this.all.get(type);
    if (!handlers) {
      return value;
    }

    let resultValue = value;
    for (const handler of handlers) {
      resultValue = handler(resultValue) as T[Key];
    }
    return resultValue;
  }
}

export default function filter<Events extends Record<FilterName, unknown>>(
  all?: FiltersHandlerMap<Events>
): Filter<Events> {
  return new BasicFilter(all);
}
