import { ExecutionContext } from 'graphql/execution/execute.js';

import { MaybePromise } from '../../../utils/src/types';

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
  onAfterSubscribe?: (subscriptionId: string) => MaybePromise<void>;
  /**
   * Subscription is complete and will be deleted from persistence
   */
  onComplete?: (subscriptionId: string) => MaybePromise<void>;
}

type SubscribeHookName = 'onSubscribe' | 'onAfterSubscribe' | 'onComplete';

export class SubscribeHookError extends Error {
  static unwrap(error: unknown): Partial<{
    exeContext: ExecutionContext;
    hookName: string;
    cause: unknown;
  }> {
    if (error instanceof SubscribeHookError) {
      return error;
    } else {
      return {};
    }
  }

  readonly hookName: SubscribeHookName;
  readonly exeContext: ExecutionContext;
  override readonly cause: unknown;

  constructor(hookName: SubscribeHookName, exeContext: ExecutionContext, cause: unknown) {
    super(`Error when calling subscribe hook ${hookName}`, {
      cause,
    });

    this.hookName = hookName;
    this.exeContext = exeContext;
    this.cause = cause;
  }
}

export interface SubscriberResult<T extends PubSubEvent> extends SubscribeOptions<T> {
  topic: T['topic'];
}

type Subscriber<T extends PubSubEvent> = (
  topic: T['topic'],
  options?: SubscribeOptions<T>
) => AsyncIterable<never> & SubscriberResult<T>;

export interface SubscriptionGraphQLContext<T extends PubSubEvent = PubSubEvent> {
  /**
   * Subscribe to a topic with options.
   */
  readonly subscribe: Subscriber<T>;
}

export type SubscriptionIterable<T extends PubSubEvent = PubSubEvent> = ReturnType<
  Subscriber<T>
>;

export function createSubscriptionContext<
  T extends PubSubEvent = PubSubEvent,
>(): SubscriptionGraphQLContext<T> {
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
