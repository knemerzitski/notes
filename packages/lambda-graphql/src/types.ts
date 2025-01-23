import { Maybe } from '~utils/types';

export interface BaseGraphQLContextTransformer<T> {
  serialize: (value: Maybe<T>) => unknown;
  parse: (value: Maybe<unknown>) => T;
}

export interface CommonWebSocketDirectParams<TBaseGraphQLContext> {
  baseGraphQLContextTransformer: BaseGraphQLContextTransformer<TBaseGraphQLContext>;
}
