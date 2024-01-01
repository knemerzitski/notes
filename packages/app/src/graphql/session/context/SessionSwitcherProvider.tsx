import { useApolloClient, useMutation, useSuspenseQuery } from '@apollo/client';
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
import GET_SESSIONS from '../operations/GET_SESSIONS';
import SWITCH_TO_SESSION from '../operations/SWITCH_TO_SESSION';
import sessionPathnamePrefix from '../pathnamePrefix';

type SwitchToSessionIndexFunction = (index: number) => Promise<boolean>;

const SwitchToSessionIndexContext = createContext<SwitchToSessionIndexFunction | null>(
  null
);

// eslint-disable-next-line react-refresh/only-export-components
export function useSwitchToSessionIndex() {
  const ctx = useContext(SwitchToSessionIndexContext);
  if (ctx === null) {
    throw new Error(
      'Error: useSwitchToSessionIndex() may be used only in the context of a <SessionSwitcherProvider> component.'
    );
  }
  return ctx;
}

export function SessionSwitcherProvider({ children }: { children: ReactNode }) {
  const apolloClient = useApolloClient();
  const [switchToSession] = useMutation(SWITCH_TO_SESSION);

  const {
    data: { savedSessions: sessions, currentSavedSession: currentSession },
  } = useSuspenseQuery(GET_SESSIONS);

  const currentSessionIndex = currentSession
    ? currentSession.index
    : sessions.length > 0
      ? sessions[0].index
      : NaN;

  // Prevents duplicate session switch through ui
  const currentSessionIndexRef = useRef(currentSessionIndex);
  // Prevents duplicate session switch when location is changed manually
  const switchingSessionRef = useRef(false);

  // Read session index from location
  const params = useParams<'sessionIndex' | '*'>();
  const locationSessionIndex = params.sessionIndex
    ? Number.parseInt(params.sessionIndex)
    : NaN;
  const isLocationIndexValid =
    0 <= locationSessionIndex && locationSessionIndex < sessions.length;

  const targetSessionIndex = !isLocationIndexValid
    ? currentSessionIndex
    : locationSessionIndex;

  const paramsRestRef = useRef(params['*'] ?? '');
  paramsRestRef.current = params['*'] ?? '';

  const navigate = useNavigate();

  const handleSwitchToSession = useCallback(
    async (index: number) => {
      if (switchingSessionRef.current) return false;
      try {
        switchingSessionRef.current = true;

        if (Number.isNaN(index) && !Number.isNaN(locationSessionIndex)) {
          navigate(joinPathnames(paramsRestRef.current));
        }

        const isIndexValid = 0 <= index && index < sessions.length;
        if (!isIndexValid) return false;

        if (currentSessionIndexRef.current !== index) {
          const result = await switchToSession({
            variables: {
              input: {
                index,
              },
            },
          });

          if (!result.data?.switchToSavedSession) return false;

          currentSessionIndexRef.current = index;

          await apolloClient.resetStore();
        }

        if (locationSessionIndex !== index) {
          navigate(
            joinPathnames(`/${sessionPathnamePrefix}/${index}`, paramsRestRef.current)
          );
        }

        return true;
      } finally {
        switchingSessionRef.current = false;
      }
    },
    [apolloClient, sessions, locationSessionIndex, navigate, switchToSession]
  );

  // Switch to correct session based on location
  useEffect(() => {
    void handleSwitchToSession(targetSessionIndex);
  }, [targetSessionIndex, handleSwitchToSession]);

  const transformPathname = useCallback(
    (pathname: string) =>
      !Number.isNaN(targetSessionIndex)
        ? joinPathnames('s', targetSessionIndex, pathname)
        : pathname,
    [targetSessionIndex]
  );

  return (
    <SwitchToSessionIndexContext.Provider value={handleSwitchToSession}>
      <ProxyRoutesProvider transform={transformPathname}>{children}</ProxyRoutesProvider>
    </SwitchToSessionIndexContext.Provider>
  );
}
