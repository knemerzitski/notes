export enum CustomHeaderName {
  /**
   * Used as a key for selecting current session from http-only cookies.
   */
  UserId = 'x-user-id',
  /**
   * Connection ID is given from WebSocket subscription client and passed in
   * HTTP requests to prevent publishing subscription events to self.
   */
  WsConnectionId = 'x-ws-connection-id',
}
