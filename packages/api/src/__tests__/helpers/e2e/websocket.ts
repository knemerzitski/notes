/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { wsCreateSimpleGraphQLWebSocket } from '../../../../../utils/src/testing/ws-simple-graphql-websocket';

const WS_URL = process.env.VITE_GRAPHQL_WS_URL!;

export function createGraphQLWebSocket(
  options?: Omit<Parameters<typeof wsCreateSimpleGraphQLWebSocket>[0], 'url'>
) {
  return wsCreateSimpleGraphQLWebSocket({
    url: WS_URL,
    ...options,
  });
}
