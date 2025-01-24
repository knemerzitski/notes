import { Maybe } from '~utils/types';

export interface BaseGraphQLContextTransformer<T> {
  serialize: (value: Maybe<T>) => unknown;
  parse: (value: Maybe<unknown>) => T;
}

export interface CommonWebSocketDirectParams<TPersistGraphQLContext> {
  baseGraphQLContextTransformer: BaseGraphQLContextTransformer<TPersistGraphQLContext>;
}
