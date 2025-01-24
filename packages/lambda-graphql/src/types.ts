import { Maybe } from '~utils/types';

export interface PersistGraphQLContext<TContext, TPersistContext> {
  readonly serialize: (value: Maybe<TPersistContext>) => object;
  readonly parse: (value: Maybe<object>) => TPersistContext;
  readonly merge: (
    ctx: Readonly<TContext>,
    persist: Readonly<TPersistContext>
  ) => Readonly<TPersistContext & TContext>;
}

export interface CommonWebSocketDirectParams<TContext, TPersistContext> {
  readonly persistGraphQLContext: PersistGraphQLContext<TContext, TPersistContext>;
}
