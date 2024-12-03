import { ApolloLink, InMemoryCache } from '@apollo/client';

import { RetryLink } from '@apollo/client/link/retry';

import apolloLogger from 'apollo-link-logger';
import SerializingLink from 'apollo-link-serialize';

import { ClearRootSubscriptionLink } from '../link/clear-root-subscription';
import { CurrentUserLink } from '../link/current-user';
import { GateLink } from '../link/gate';
import { passthrough } from '../link/passthrough';
import { PersistLink } from '../link/persist';
import { StatsLink } from '../link/stats';
import { WaitLink } from '../link/wait';
import { AppContext } from '../types';
import { WebSocketClient } from '../ws/websocket-client';

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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
