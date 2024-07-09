export enum CustomHeaderName {
  /**
   * Used as a key for selecting current session from http-only cookies.
   */
  USER_ID = 'x-user-id',
  /**
   * Connection ID is given from WebSocket subscription client and passed in
   * HTTP requests to prevent publishing subscription events to self.
   */
  WS_CONNECTION_ID = 'x-ws-connection-id',
}
