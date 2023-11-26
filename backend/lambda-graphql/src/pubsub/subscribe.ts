import { GraphQLError } from 'graphql';
import { ExecutionContext } from 'graphql/execution/execute';

import { MaybePromise } from '~common/types';

import getResolverArgs from '../graphql/getResolverArgs';

export interface PubSubEvent {
  topic: string;
  payload: Record<string, unknown>;
}

export interface SubscribeOptions<T extends PubSubEvent> {
  filter?: T['payload'];
  onSubscribe?: () => MaybePromise<void>;
  onAfterSubscribe?: () => MaybePromise<void>;
  onComplete?: () => MaybePromise<void>;
}

export interface SubscriberResult<T extends PubSubEvent> extends SubscribeOptions<T> {
  topic: T['topic'];
  deny: false;
}

type DenySubscriber = () => AsyncIterable<never> & { deny: true };

type Subscriber<T extends PubSubEvent> = (
  topic: T['topic'],
  options?: SubscribeOptions<T>
) => AsyncIterable<never> & SubscriberResult<T>;

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
    subscribe: (topic, options = {}) => ({
      ...neverAsyncIteratorSymbol,
      ...options,
      topic,
      deny: false,
    }),
    denySubscription: () => ({
      ...neverAsyncIteratorSymbol,
      deny: true,
    }),
  };
}

export function getSubscribeFieldResult(
  execContext: ExecutionContext
): SubscriberResult<PubSubEvent> {
  const { field, parent, args, contextValue, info } = getResolverArgs(execContext);
  if (!field?.subscribe) {
    throw new Error('No field subscribe in schema');
  }

  const subscribeFieldResult = field.subscribe(
    parent,
    args,
    contextValue,
    info
  ) as SubscriptionIterable;
  if (subscribeFieldResult.deny) {
    throw new GraphQLError(`Access denied`);
  }

  if (!subscribeFieldResult.topic) {
    throw new Error(`Topic from field resolver is undefined`);
  }

  return subscribeFieldResult;
}
