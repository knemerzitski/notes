export interface SubscribeEvent {
  topic: string;
}

export interface SubscriptionIterable<T extends SubscribeEvent = SubscribeEvent> {
  (): AsyncIterable<T>;
  topic: string;
}

type Subscriber<T> = (topic: string) => AsyncIterable<T>;

export interface SubscriptionContext<T extends SubscribeEvent = SubscribeEvent> {
  subscribe: Subscriber<T>;
}

export function createSubscriptionContext<
  T extends SubscribeEvent = SubscribeEvent,
>(): SubscriptionContext<T> {
  return {
    subscribe: (topic) => {
      return {
        [Symbol.asyncIterator]() {
          return {
            // eslint-disable-next-line @typescript-eslint/require-await
            async next() {
              throw new Error(
                'Subscribe should never be iterated over in lambda environment!'
              );
            },
          };
        },
        topic,
      };
    },
  };
}
