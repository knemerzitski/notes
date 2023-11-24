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

import { gql } from '../__generated__/gql';
import ProxyRoutesProvider from '../router/ProxyRoutesProvider';
import joinPathnames from '../utils/joinPathnames';

import GET_SESSIONS from './graphql/GET_SESSIONS';

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

const SWITCH_TO_SESSION = gql(`
  mutation SwitchToSession($index: Int!) {
    switchToSession(index: $index) @client
  }
`);

export function SessionSwitcherProvider({ children }: { children: ReactNode }) {
  const apolloClient = useApolloClient();
  const [switchToSession] = useMutation(SWITCH_TO_SESSION);

  const {
    data: { sessions, activeSessionIndex },
  } = useSuspenseQuery(GET_SESSIONS);

  // Prevents duplicate session switch through ui
  const activeSessionIndexRef = useRef(activeSessionIndex);
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
    ? activeSessionIndex
    : locationSessionIndex;

  const paramsRestRef = useRef(params['*'] ?? '');
  paramsRestRef.current = params['*'] ?? '';

  const navigate = useNavigate();

  const handleSwitchToSession = useCallback(
    async (index: number) => {
      if (switchingSessionRef.current) return false;
      try {
        switchingSessionRef.current = true;

        const isIndexValid = 0 <= index && index < sessions.length;
        if (!isIndexValid) return false;

        if (activeSessionIndexRef.current !== index) {
          const result = await switchToSession({
            variables: {
              index,
            },
            async update(_cache, { data }) {
              if (!data?.switchToSession) return;

              await apolloClient.resetStore();
            },
          });

          if (!result.data?.switchToSession) return false;

          activeSessionIndexRef.current = index;
        }

        if (locationSessionIndex !== index) {
          navigate(joinPathnames(`/s/${index}`, paramsRestRef.current));
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
    (pathname: string) => joinPathnames('s', targetSessionIndex, pathname),
    [targetSessionIndex]
  );

  return (
    <SwitchToSessionIndexContext.Provider value={handleSwitchToSession}>
      <ProxyRoutesProvider transform={transformPathname}>{children}</ProxyRoutesProvider>
    </SwitchToSessionIndexContext.Provider>
  );
}
