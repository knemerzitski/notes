import { useMutation } from '@apollo/client';
import { useEffect } from 'react';

import {
  AuthenticationFailedReason,
  GraphQLErrorCode,
} from '~api-app-shared/graphql/error-codes';

import { gql } from '../../../__generated__/gql';
import { useCustomApolloClient } from '../../apollo-client/context/CustomApolloClientProvider';
import useAddFetchResultErrorHandler from '../../apollo-client/hooks/useAddFetchResultErrorHandler';
import {
  useSnackbarAlert,
  useSnackbarError,
} from '../../common/components/SnackbarAlertProvider';
import { getCurrentUserId, getSignedInUserIds, setAvailableUsers } from '../user';

const SYNC_SESSIONS = gql(`
  mutation SessionSynchronizationSyncSessions($input: SyncSessionCookiesInput!) {
    syncSessionCookies(input: $input) {
      availableUserIds
    }
  }
`);

const FRAGMENT_SESSION_EXPIRED = gql(`
  fragment SessionSynchronizationUpdateExpired on User {
    isSessionExpired
  }
`);

/**
 * Synchronizes session between local state and server. Marks sessions expired.
 */
export default function SessionSynchronization() {
  const customApolloClient = useCustomApolloClient();
  const addFetchResultErrorHandler = useAddFetchResultErrorHandler();
  const [syncSessions] = useMutation(SYNC_SESSIONS);
  const showAlert = useSnackbarAlert();
  const showError = useSnackbarError();

  useEffect(() => {
    return addFetchResultErrorHandler(async (_value, firstError, context) => {
      const code = firstError.extensions.code;
      if (code === GraphQLErrorCode.UNAUTHENTICATED) {
        const reason = firstError.extensions.reason;
        if (
          reason === AuthenticationFailedReason.SESSION_EXPIRED ||
          reason === AuthenticationFailedReason.USER_NO_SESSION
        ) {
          // Mark current user session expired
          const currentUserId = getCurrentUserId(customApolloClient.cache);
          if (currentUserId) {
            customApolloClient.writeFragmentNoRetain({
              id: customApolloClient.cache.identify({
                __typename: 'User',
                id: currentUserId,
              }),
              fragment: FRAGMENT_SESSION_EXPIRED,
              data: {
                isSessionExpired: true,
              },
            });

            showAlert({
              severity: 'warning',
              children: <>Current session has expired! Please sign in again.</>,
              snackbarProps: {
                anchorOrigin: { vertical: 'top', horizontal: 'center' },
              },
            });
          }
          return true;
        } else {
          const { errors } = await syncSessions({
            variables: {
              input: {
                availableUserIds: getSignedInUserIds(customApolloClient.cache),
              },
            },
            context,
            update(cache, { data }) {
              if (!data) return;

              const actualAvailableUserIds = data.syncSessionCookies.availableUserIds;
              setAvailableUsers(cache, actualAvailableUserIds, true);
            },
          });

          if (errors?.[0]) {
            showError(errors[0].message);
          }

          return true;
        }
      }
      return false;
    });
  }, [
    customApolloClient,
    addFetchResultErrorHandler,
    showAlert,
    showError,
    syncSessions,
  ]);

  return null;
}
