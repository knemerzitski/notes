export interface BaseGraphQLContext {
  /**
   * GraphQL resolver can be executed in different contexts.
   * - `request` - Typical HTTP request for querying or mutating data.
   * - `subscription` - Subscription via WebSocket. Only for subscribing.
   * - `publish` - Usually invoked within `request` that publishes data for subscribed users.
   * Publish is executed in sepratate context with permissions of user who subscribed.
   */
  readonly eventType: 'request' | 'subscription' | 'publish';
}
