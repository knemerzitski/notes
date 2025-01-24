import { Maybe } from '~utils/types';

export interface BaseGraphQLContextTransformer<TContext, TPersistContext> {
  serialize: (value: Maybe<TPersistContext>) => object;
  parse: (value: Maybe<object>) => TPersistContext;
  merge: (
    ctx: Readonly<TContext>,
    persist: Readonly<TPersistContext>
  ) => Readonly<TPersistContext & TContext>;
}

export interface CommonWebSocketDirectParams<TContext, TPersistContext> {
  baseGraphQLContextTransformer: BaseGraphQLContextTransformer<TContext, TPersistContext>;
}
