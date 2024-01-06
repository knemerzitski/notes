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

import ProxyRoutesProvider from '../../../router/ProxyRoutesProvider';
import joinPathnames from '../../../utils/joinPathnames';
import { gql } from '../../__generated__/gql';
import useSessions from '../hooks/useSessions';
import sessionPrefix from '../../../router/sessionPrefix';

const QUERY = gql(`
  query SessionSwitcherProvider {
    savedSessions @client {
      displayName
      email
    }
    currentSavedSessionIndex @client
  }
`);

type SwitchToSessionFunction = (index: number | null) => Promise<boolean>;

const SwitchToSessionContext = createContext<SwitchToSessionFunction | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useSwitchToSession() {
  const ctx = useContext(SwitchToSessionContext);
  if (ctx === null) {
    throw new Error(
      'Error: useSwitchToSessionIndex() may be used only in the context of a <SessionSwitcherProvider> component.'
    );
  }
  return ctx;
}

export function SessionSwitcherProvider({ children }: { children: ReactNode }) {
  const {
    data: { savedSessions: sessions, currentSavedSessionIndex: currentSessionIndex },
  } = useSuspenseQuery(QUERY);

  const apolloClient = useApolloClient();
  const {
    operations: { switchToSession },
  } = useSessions();

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

  const paramsRestRef = useRef(params['*'] ?? '');
  paramsRestRef.current = params['*'] ?? '';

  // Switches session and updates location
  const handleSwitchToSession = useCallback(
    async (index: number | null) => {
      if (switchingSessionRef.current) return false;
      try {
        switchingSessionRef.current = true;

        if (!switchToSession(index)) return false;

        if (locationSessionIndex !== index) {
          if (index == null) {
            navigate(joinPathnames(paramsRestRef.current));
          } else {
            navigate(
              joinPathnames(`/${sessionPrefix}/${index}`, paramsRestRef.current)
            );
          }

          await apolloClient.resetStore();
        }

        return true;
      } finally {
        switchingSessionRef.current = false;
      }
    },
    [apolloClient, locationSessionIndex, navigate, switchToSession]
  );

  // Switch to correct session based on location
  useEffect(() => {
    void handleSwitchToSession(targetSessionIndex);
  }, [targetSessionIndex, handleSwitchToSession]);

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
