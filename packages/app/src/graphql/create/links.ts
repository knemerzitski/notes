import { ApolloLink, InMemoryCache } from '@apollo/client';
import { WaitLink } from '../link/wait';
import { StatsLink } from '../link/stats';
import { WebSocketClient } from '../ws/websocket-client';
import { passthrough } from '../link/passthrough';
import { AppContext } from '../types';
import { RetryLink } from '@apollo/client/link/retry';
import SerializingLink from 'apollo-link-serialize';
import { PersistLink } from '../link/persist';
import apolloLogger from 'apollo-link-logger';
import { CurrentUserLink } from '../link/current-user';
import { GateLink } from '../link/gate';
import { ClearRootSubscriptionLink } from '../link/clear-root-subscription';

export function createLinks({
  appContext,
  wsClient,
  cache,
  options,
}: {
  appContext: Pick<AppContext, 'userId'>;
  wsClient?: WebSocketClient;
  cache: InMemoryCache;
  options?: {
    persist?: ConstructorParameters<typeof PersistLink>[1];
    debug?: {
      /**
       * Throttle each request by milliseconds
       */
      throttle?: number;
      /**
       * Include a logger link
       * @default false
       */
      logging?: boolean;
    };
  };
}) {
  const clearRootSubscripionLink = new ClearRootSubscriptionLink();
  const currentUserLink = new CurrentUserLink(appContext, wsClient);
  const loggerLink = options?.debug?.logging ? apolloLogger : passthrough();
  const statsLink = new StatsLink();
  const persistLink = new PersistLink(cache, options?.persist);
  const gateLink = new GateLink();
  const serializingLink = new SerializingLink();
  const retryLink = new RetryLink();

  const waitLink = options?.debug?.throttle
    ? new WaitLink({
        waitTime: options.debug.throttle,
      })
    : passthrough();

  return {
    link: ApolloLink.from([
      clearRootSubscripionLink,
      currentUserLink,
      loggerLink,
      statsLink,
      // Persist operations in case app is closed
      persistLink,
      // Serialize(one at a time) same type of operations
      serializingLink,
      // Retry failed operations
      retryLink,
      // Pause operations until all gates for a operation are open (offline, user session expired)
      gateLink,
      // Throttling for debugging purposes
      waitLink,
    ]),
    pick: {
      clearRootSubscripionLink,
      currentUserLink,
      loggerLink,
      statsLink,
      persistLink,
      serializingLink,
      retryLink,
      gateLink,
      waitLink,
    },
  };
}
