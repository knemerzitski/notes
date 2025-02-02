export enum CustomHeaderName {
  /**
   * Connection ID is given from WebSocket subscription client and passed in
   * HTTP requests to prevent publishing subscription events to self.
   */
  WS_CONNECTION_ID = 'x-ws-connection-id',
}
