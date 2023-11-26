export interface PubSubEvent {
  topic: string;
  payload: Record<string, unknown>;
}

export interface SubscribeOptions<T extends PubSubEvent> {
  filter?: T['payload'];
}

interface SubscribeIterable<T extends PubSubEvent> extends SubscribeOptions<T> {
  topic: T['topic'];
  deny: false;
}

type DenySubscriber = () => AsyncIterable<never> & { deny: true };

type Subscriber<T extends PubSubEvent> = (
  topic: T['topic'],
  options?: SubscribeOptions<T>
) => AsyncIterable<never> & SubscribeIterable<T>;

export interface SubscriptionContext<T extends PubSubEvent = PubSubEvent> {
  /**
   * Subscribe to a topic with options.
   */
  subscribe: Subscriber<T>;
  /**
   * Call this function to not subscribe.
   * E.g when not authentication information is not available.
   * @returns AsyncIterable that does nothing with {deny: true}
   */
  denySubscription: DenySubscriber;
}

export type SubscriptionIterable<T extends PubSubEvent = PubSubEvent> = ReturnType<
  Subscriber<T> | DenySubscriber
>;

export function createSubscriptionContext<
  T extends PubSubEvent = PubSubEvent,
>(): SubscriptionContext<T> {
  const neverAsyncIteratorSymbol = {
    [Symbol.asyncIterator]() {
      return {
        // eslint-disable-next-line @typescript-eslint/require-await
        async next() {
          throw new Error('Async iterator should never used in a lambda environment!');
        },
      };
    },
  };

  return {
    subscribe: (topic, { filter } = {}) => ({
      ...neverAsyncIteratorSymbol,
      topic,
      filter,
      deny: false,
    }),
    denySubscription: () => ({
      ...neverAsyncIteratorSymbol,
      deny: true,
    }),
  };
}
