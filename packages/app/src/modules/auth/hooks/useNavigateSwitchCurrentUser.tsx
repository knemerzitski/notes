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

import ProxyRoutesProvider from '../../router/context/ProxyRoutesProvider';
import { useCustomApolloClient } from '../../apollo-client/context/CustomApolloClientProvider';
import { gql } from '../../../__generated__/gql';
import { joinPathnames, slicePathnames } from '../../common/utils/pathname';
import { useLocationPrefix } from '../../router/context/LocationPrefixProvider';
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

type NavigateSwitchCurrentUserFn = (userId: string | true | null) => Promise<void>;

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

  // Switches user and updates location
  const handleNavigateSwitchCurrentUser = useCallback(
    async (newUserId: string | true | null) => {
      if (switchingUserRef.current) {
        return;
      }
      try {
        switchingUserRef.current = true;

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
            navigate(joinPathnames(paramsRestRef.current));
          } else {
            // Switches user
            navigate(
              joinPathnames(`/${locationPrefix}/${newIndex}`, paramsRestRef.current)
            );
          }
        }

        // Restart WebSocket and refetch queries on user change
        if (newUserId !== targetUserId) {
          customApolloClient.restartSubscriptionClient();
          await apolloClient.reFetchObservableQueries();
        }
      } finally {
        switchingUserRef.current = false;
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

  // Switch to correct user based on location
  useEffect(() => {
    void handleNavigateSwitchCurrentUser(targetUserId);
  }, [targetUserId, handleNavigateSwitchCurrentUser]);

  const transformPathname = useCallback(
    (pathname: string) =>
      targetUserIndex != null
        ? joinPathnames(locationPrefix, targetUserIndex, pathname)
        : pathname,
    [targetUserIndex, locationPrefix]
  );

  const inverseTransformPathname = useCallback(
    // Remove /u/{i}
    (pathname: string) =>
      targetUserIndex != null ? slicePathnames(pathname, 2) : pathname,
    [targetUserIndex]
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
