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

import { gql } from '../../../__generated__/gql';
import ProxyRoutesProvider from '../../../router/ProxyRoutesProvider';
import sessionPrefix from '../../../router/sessionPrefix';
import joinPathnames from '../../../utils/joinPathnames';

import useLocalStateSessions from './useLocalStateSessions';

const PROVIDER_QUERY = gql(`
  query SessionSwitcherProvider {
    savedSessions @client {
      key
      displayName
      email
    }
    currentSavedSessionIndex @client
  }
`);

type SwitchToSessionFunction = (sessionKey: string | null) => Promise<boolean>;

const SwitchToSessionContext = createContext<SwitchToSessionFunction | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export default function useSwitchToSession() {
  const ctx = useContext(SwitchToSessionContext);
  if (ctx === null) {
    throw new Error('useSwitchToSession() requires context <SessionSwitcherProvider>');
  }
  return ctx;
}

export function SessionSwitcherProvider({ children }: { children: ReactNode }) {
  const {
    data: { savedSessions: sessions, currentSavedSessionIndex: currentSessionIndex },
  } = useSuspenseQuery(PROVIDER_QUERY);

  const apolloClient = useApolloClient();
  const { switchToSession } = useLocalStateSessions();

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
      targetSessionKey = String(targetSession.key);
    }
  }

  const paramsRestRef = useRef(params['*'] ?? '');
  paramsRestRef.current = params['*'] ?? '';

  // Switches session and updates location
  const handleSwitchToSession = useCallback(
    async (newSessionKey: string | null) => {
      if (switchingSessionRef.current) return false;
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
          await apolloClient.resetStore();
        }

        return true;
      } finally {
        switchingSessionRef.current = false;
      }
    },
    [apolloClient, locationSessionIndex, navigate, switchToSession, targetSessionKey]
  );

  // Switch to correct session based on location
  useEffect(() => {
    void handleSwitchToSession(targetSessionKey);
  }, [targetSessionKey, handleSwitchToSession]);

  const transformPathname = useCallback(
    (pathname: string) =>
      targetSessionIndex != null
        ? joinPathnames(sessionPrefix, targetSessionIndex, pathname)
        : pathname,
    [targetSessionIndex]
  );

  return (
    <SwitchToSessionContext.Provider value={handleSwitchToSession}>
      <ProxyRoutesProvider transform={transformPathname}>{children}</ProxyRoutesProvider>
    </SwitchToSessionContext.Provider>
  );
}
