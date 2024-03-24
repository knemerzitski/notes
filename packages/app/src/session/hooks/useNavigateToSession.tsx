import { useApolloClient, useSuspenseQuery } from '@apollo/client';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useExtendedApolloClient } from '../../App';
import { gql } from '../../__generated__/gql';
import ProxyRoutesProvider from '../../router/ProxyRoutesProvider';
import sessionPrefix from '../../router/sessionPrefix';
import joinPathnames from '../../utils/joinPathnames';
import useSessionMutations from '../state/useSessionMutations';

const PROVIDER_QUERY = gql(`
  query SessionSwitcherProvider {
    clientSessions @client {
      id
      displayName
      email
    }
    currentClientSessionIndex @client
  }
`);

type NavigateToSessionFn = (sessionId: string | null) => Promise<void>;

const NavigateToSessionContext = createContext<NavigateToSessionFn | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export default function useNavigateToSession() {
  const ctx = useContext(NavigateToSessionContext);
  if (ctx === null) {
    throw new Error(
      'useNavigateToSession() requires context <NavigateToSessionProvider>'
    );
  }
  return ctx;
}

export function NavigateToSessionProvider({ children }: { children: ReactNode }) {
  const {
    data: { clientSessions: sessions, currentClientSessionIndex: currentSessionIndex },
  } = useSuspenseQuery(PROVIDER_QUERY);

  const extendedApolloClient = useExtendedApolloClient();
  const apolloClient = useApolloClient();
  const { switchToSession } = useSessionMutations();

  const navigate = useNavigate();

  const params = useParams<'sessionIndex' | '*'>();

  // Prevents duplicate session switch when location is being changed
  const switchingSessionRef = useRef(false);

  // Read session index from location
  const parsedLocationSessionIndex = params.sessionIndex
    ? Number.parseInt(params.sessionIndex)
    : NaN;
  const locationSessionIndex = !Number.isNaN(parsedLocationSessionIndex)
    ? parsedLocationSessionIndex
    : null;

  // Select target session index based on location and current session
  // Prioritize reading from location, if that is not defined then restore from session index
  let targetSessionIndex: number | null;
  if (
    locationSessionIndex &&
    0 <= locationSessionIndex &&
    locationSessionIndex < sessions.length
  ) {
    targetSessionIndex = locationSessionIndex;
  } else {
    targetSessionIndex = currentSessionIndex ?? (sessions.length > 0 ? 0 : null);
  }

  let targetSessionKey: string | null = null;
  if (targetSessionIndex != null) {
    const targetSession = sessions[targetSessionIndex];
    if (targetSession) {
      targetSessionKey = String(targetSession.id);
    }
  }

  const paramsRestRef = useRef(params['*'] ?? '');
  paramsRestRef.current = params['*'] ?? '';

  // Switches session and updates location
  const handleNavigateToSession = useCallback(
    async (newSessionKey: string | null) => {
      if (switchingSessionRef.current) {
        return;
      }
      try {
        switchingSessionRef.current = true;

        const switchResult = switchToSession(newSessionKey);
        const newIndex = switchResult != null ? switchResult.index : null;

        // Update location if new index doesn't match
        if (locationSessionIndex !== newIndex) {
          if (newSessionKey == null) {
            navigate(joinPathnames(paramsRestRef.current));
          } else {
            navigate(
              joinPathnames(`/${sessionPrefix}/${newIndex}`, paramsRestRef.current)
            );
          }
        }

        // Reset store if session key changed
        if (newSessionKey !== targetSessionKey) {
          extendedApolloClient.restartSubscriptionClient();
          await apolloClient.resetStore();
        }
      } finally {
        switchingSessionRef.current = false;
      }
    },
    [
      apolloClient,
      locationSessionIndex,
      navigate,
      switchToSession,
      targetSessionKey,
      extendedApolloClient,
    ]
  );

  // Switch to correct session based on location
  useEffect(() => {
    void handleNavigateToSession(targetSessionKey);
  }, [targetSessionKey, handleNavigateToSession]);

  const transformPathname = useCallback(
    (pathname: string) =>
      targetSessionIndex != null
        ? joinPathnames(sessionPrefix, targetSessionIndex, pathname)
        : pathname,
    [targetSessionIndex]
  );

  return (
    <NavigateToSessionContext.Provider value={handleNavigateToSession}>
      <ProxyRoutesProvider transform={transformPathname}>{children}</ProxyRoutesProvider>
    </NavigateToSessionContext.Provider>
  );
}
