export interface BaseGraphQLContext {
  readonly eventType: 'request' | 'subscription' | 'publish';
}
