import { ApolloLink, FetchResult, NextLink, Observable, Operation } from '@apollo/client';
import { WebSocketClient } from '../ws/websocket-client';
import { setOperationUserId } from './current-user';

export class WebSocketClientSetOperationUserIdLink extends ApolloLink {
  constructor(private readonly wsClient: Pick<WebSocketClient, 'userId'>) {
    super();
  }

  override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (!forward) {
      return null;
    }

    setOperationUserId(operation, this.wsClient.userId);

    return forward(operation);
  }
}
