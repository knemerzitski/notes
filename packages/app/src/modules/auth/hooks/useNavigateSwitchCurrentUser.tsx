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
import { useCustomApolloClient } from '../../apollo-client/context/CustomApolloClientProvider';
import { joinPathnames, slicePathnames } from '../../common/utils/pathname';
import { useLocationPrefix } from '../../router/context/LocationPrefixProvider';
import ProxyRoutesProvider from '../../router/context/ProxyRoutesProvider';
import { getCurrentUserId, setCurrentSignedInUser } from '../user';

const QUERY = gql(`
  query NavigateSwitchCurrentUserProvider {
    signedInUsers @client {
      id
    }
    currentSignedInUser @client {
      id
    }
  }
`);

type NavigateSwitchCurrentUserFn = <T>(
  newUserId: SwitchUserId | SwitchUserClosure<T>
) => Promise<T | undefined>;

/**
 * string - specific userId \
 * true - first available user \
 * null - no user, sign out
 */
type SwitchUserId = string | true | null;

interface SwitchUserContext {
  /**
   * Set new userId after outside closure
   */
  switchAfterClosure: (newUserId: SwitchUserId) => void;
}

type SwitchUserClosure<T> = (context: SwitchUserContext) => Promise<T>;

const NavigateSwitchCurrentUserContext =
  createContext<NavigateSwitchCurrentUserFn | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export default function useNavigateSwitchCurrentUser() {
  const ctx = useContext(NavigateSwitchCurrentUserContext);
  if (ctx === null) {
    throw new Error(
      'useNavigateSwitchCurrentUser() requires context <NavigateSwitchCurrentUserProvider>'
    );
  }
  return ctx;
}

export function NavigateSwitchCurrentUserProvider({ children }: { children: ReactNode }) {
  const {
    data: { signedInUsers, currentSignedInUser },
  } = useSuspenseQuery(QUERY);

  const customApolloClient = useCustomApolloClient();
  const apolloClient = useApolloClient();
  const locationPrefix = useLocationPrefix();

  const navigate = useNavigate();

  const params = useParams<'currentUserIndex' | '*'>();

  const currentSignedInUserIndex = currentSignedInUser
    ? signedInUsers.findIndex(({ id }) => currentSignedInUser.id === id)
    : -1;
  const currentUserIndex =
    currentSignedInUserIndex !== -1 ? currentSignedInUserIndex : null;

  // Prevents duplicate user switch when location is being changed
  const switchingUserRef = useRef(false);

  // Read user index from location
  const parsedLocationUserIndex = params.currentUserIndex
    ? Number.parseInt(params.currentUserIndex)
    : NaN;
  const locationUserIndex = !Number.isNaN(parsedLocationUserIndex)
    ? parsedLocationUserIndex
    : null;

  // Select target user index based on location and current user
  // Prioritize reading from location, if that is not defined then restore from user index
  let targetUserIndex: number | null;
  if (
    locationUserIndex != null &&
    0 <= locationUserIndex &&
    locationUserIndex < signedInUsers.length
  ) {
    targetUserIndex = locationUserIndex;
  } else {
    targetUserIndex = currentUserIndex ?? (signedInUsers.length > 0 ? 0 : null);
  }

  let targetUserId: string | null = null;
  if (targetUserIndex != null) {
    const targetUser = signedInUsers[targetUserIndex];
    if (targetUser) {
      targetUserId = String(targetUser.id);
    }
  }

  const paramsRestRef = useRef(params['*'] ?? '');
  paramsRestRef.current = params['*'] ?? '';

  // Directly navigates and switches user without any checks
  const navigateSwitchCurrentUser = useCallback(
    async (newUserId: SwitchUserId) => {
      if (newUserId === true) {
        newUserId = getCurrentUserId(apolloClient.cache) ?? null;
      }

      const setUserResult = setCurrentSignedInUser(apolloClient.cache, newUserId);
      const indexOfUser = setUserResult?.signedInUsers.findIndex(
        ({ id }) => id === setUserResult.currentSignedInUser?.id
      );
      const newIndex = indexOfUser != null && indexOfUser !== -1 ? indexOfUser : null;

      // Update location if new index doesn't match
      if (locationUserIndex !== newIndex) {
        if (newIndex == null) {
          // All users signed out
          navigate(joinPathnames(paramsRestRef.current), {
            replace: true,
            state: {
              replaced: true,
            },
          });
        } else {
          // Switches user
          navigate(
            joinPathnames(`/${locationPrefix}/${newIndex}`, paramsRestRef.current),
            {
              replace: true,
              state: {
                replaced: true,
              },
            }
          );
        }
      }

      // Restart WebSocket and refetch queries on user change
      if (newUserId !== targetUserId) {
        customApolloClient.restartSubscriptionClient();
        await apolloClient.reFetchObservableQueries();
      }
    },
    [
      apolloClient,
      locationUserIndex,
      navigate,
      targetUserId,
      customApolloClient,
      locationPrefix,
    ]
  );

  // Switches user and updates browser location
  const handleNavigateSwitchCurrentUser = useCallback(
    async function <T>(newUserId: SwitchUserId | SwitchUserClosure<T>) {
      if (switchingUserRef.current) {
        return;
      }

      try {
        switchingUserRef.current = true;

        if (typeof newUserId === 'function') {
          let theUserId: string | true | null | undefined;

          const closureResult = await newUserId({
            switchAfterClosure(newUserId) {
              theUserId = newUserId;
            },
          });

          if (theUserId !== undefined) {
            await navigateSwitchCurrentUser(theUserId);
          }

          return closureResult;
        }

        await navigateSwitchCurrentUser(newUserId);
        return;
      } finally {
        switchingUserRef.current = false;
      }
    },
    [navigateSwitchCurrentUser]
  );

  // Switch to correct user based on location
  useEffect(() => {
    void handleNavigateSwitchCurrentUser(targetUserId);
  }, [targetUserId, handleNavigateSwitchCurrentUser]);

  function hasLocationPrefix(pathname: string) {
    return pathname.match(/^\/u\/\d+(\/.+)?/g) != null;
  }

  const inverseTransformPathname = useCallback(
    // Remove /u/{i}
    (pathname: string) =>
      hasLocationPrefix(pathname) ? slicePathnames(pathname, 2) : pathname,
    []
  );

  const transformPathname = useCallback(
    (pathname: string) => {
      if (hasLocationPrefix(pathname)) {
        pathname = inverseTransformPathname(pathname);
      }

      return targetUserIndex != null
        ? joinPathnames(locationPrefix, targetUserIndex, pathname)
        : pathname;
    },
    [targetUserIndex, locationPrefix, inverseTransformPathname]
  );

  return (
    <NavigateSwitchCurrentUserContext.Provider value={handleNavigateSwitchCurrentUser}>
      <ProxyRoutesProvider
        transform={transformPathname}
        inverseTransform={inverseTransformPathname}
      >
        {children}
      </ProxyRoutesProvider>
    </NavigateSwitchCurrentUserContext.Provider>
  );
}
