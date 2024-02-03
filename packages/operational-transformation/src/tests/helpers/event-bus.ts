type Payload<T> = T;
type Handler<T = unknown> = (payload: Payload<T>) => void;
type AnyHandler<T = unknown> = (name: string, payload: Payload<T>) => void;

/**
 * Simple event bus: publish/subcribe.
 */
export class EventBus {
  /**
   * Stores handlers that are called on all events
   */
  private allHandlers = new Set<AnyHandler>();
  private handlers: Record<string, Set<Handler>> = {};

  private getHandlersByName(name: string): Set<Handler> {
    if (!(name in this.handlers)) {
      this.handlers[name] = new Set();
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.handlers[name]!;
  }

  /**
   * Subscribe to an event.
   * @param name Name of the event. Use '*' to listen to all events regardless of name
   * @param handler Event handler
   */
  on<T>(name: string, handler: Handler<T>): () => void;
  on<T>(name: '*', handler: AnyHandler<T>): () => void;
  on<T>(name: string, handler: Handler<T> | AnyHandler<T>): () => void {
    if (name === '*') {
      this.allHandlers.add(handler as AnyHandler);
      return () => this.allHandlers.delete(handler as AnyHandler);
    } else {
      this.getHandlersByName(name).add(handler as Handler);
      return () => this.getHandlersByName(name).delete(handler as Handler);
    }
  }

  /**
   * Unsubscribe from event.
   * @param name
   * @param handler If handler is not specified then all events by {@link name}
   * are removed.
   */
  off<T>(name: string, handler: Handler<T>): void;
  off<T>(name: '*', handler: AnyHandler<T>): void;
  off<T>(name: string, handler?: Handler<T> | AnyHandler<T>): void {
    if (name === '*') {
      if (handler) {
        this.allHandlers.delete(handler as AnyHandler);
      } else {
        this.allHandlers.clear();
      }
    } else {
      if (handler) {
        this.getHandlersByName(name).delete(handler as Handler);
      } else {
        this.getHandlersByName(name).clear();
      }
    }
  }

  /**
   * Emit an event with a optional payload.
   * @param name
   * @param payload
   */
  emit<T>(name: string, payload?: T) {
    this.allHandlers.forEach((handler) => {
      handler(name, payload);
    });
    this.getHandlersByName(name).forEach((handler) => {
      handler(payload);
    });
  }
}
