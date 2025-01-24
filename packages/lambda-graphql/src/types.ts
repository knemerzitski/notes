import { Maybe } from '~utils/types';

export interface BaseGraphQLContextTransformer<T> {
  serialize: (value: Maybe<T>) => object;
  parse: (value: Maybe<object>) => T;
}

export interface CommonWebSocketDirectParams<TPersistGraphQLContext> {
  baseGraphQLContextTransformer: BaseGraphQLContextTransformer<TPersistGraphQLContext>;
}
