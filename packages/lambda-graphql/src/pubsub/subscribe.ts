import { ExecutionContext } from 'graphql/execution/execute';
import { MaybePromise } from '~utils/types';

import { getResolverArgs } from '../graphql/get-resolver-args';

export interface PubSubEvent {
  topic: string;
  payload: Record<string, unknown>;
}

export interface SubscribeOptions<T extends PubSubEvent> {
  filter?: T['payload'];
  /**
   * Before subscription is persisted
   */
  onSubscribe?: () => MaybePromise<void>;
  /**
   * After subscription has been persisted
   */
  onAfterSubscribe?: () => MaybePromise<void>;
  /**
   * Subscription is complete and will be deleted from persistence
   */
  onComplete?: () => MaybePromise<void>;
}

export interface SubscriberResult<T extends PubSubEvent> extends SubscribeOptions<T> {
  topic: T['topic'];
}

type Subscriber<T extends PubSubEvent> = (
  topic: T['topic'],
  options?: SubscribeOptions<T>
) => AsyncIterable<never> & SubscriberResult<T>;

export interface SubscriptionContext<T extends PubSubEvent = PubSubEvent> {
  /**
   * Subscribe to a topic with options.
   */
  subscribe: Subscriber<T>;
}

export type SubscriptionIterable<T extends PubSubEvent = PubSubEvent> = ReturnType<
  Subscriber<T>
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
    subscribe: (topic, options = {}) => ({
      ...neverAsyncIteratorSymbol,
      ...options,
      topic,
    }),
  };
}

export async function getSubscribeFieldResult(
  execContext: ExecutionContext
): Promise<SubscriberResult<PubSubEvent>> {
  const { field, parent, args, contextValue, info } = getResolverArgs(execContext);
  if (!field?.subscribe) {
    throw new Error('No field subscribe in schema');
  }

  const subscribeFieldResult = (await field.subscribe(
    parent,
    args,
    contextValue,
    info
  )) as SubscriptionIterable;
  if (!subscribeFieldResult.topic) {
    throw new Error(`Expected a topic from field resolver but is undefined`);
  }

  return subscribeFieldResult;
}
