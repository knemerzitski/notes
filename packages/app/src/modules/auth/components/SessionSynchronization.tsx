import { useApolloClient, useMutation } from '@apollo/client';
import { useEffect } from 'react';

import {
  AuthenticationFailedReason,
  GraphQLErrorCode,
} from '~api-app-shared/graphql/error-codes';

import useAddFetchResultErrorHandler from '../../apollo-client/hooks/useAddFetchResultErrorHandler';
import { gql } from '../../../__generated__/gql';
import {
  useSnackbarAlert,
  useSnackbarError,
} from '../../common/components/SnackbarAlertProvider';
import { getCurrentUserId } from '../hooks/useCurrentUserId';

const SYNC_SESSIONS = gql(`
  mutation SessionSynchronizationSyncSessions($input: SyncSessionCookiesInput!) {
    syncSessionCookies(input: $input) {
      availableUserIds
    }
  }
`);

const QUERY_USERS = gql(`
  query SessionSynchronizationUsers {
    signedInUsers @client {
      id
      isSessionExpired
    }
  }
`);

const QUERY_CURRENT_USER = gql(`
  query SessionSynchronizationUpdateExpired {
    currentSignedInUser @client {
      id
      isSessionExpired
    }
  }
`);

/**
 * Synchronizes session between local state and server. Marks sessions expired.
 */
export default function SessionSynchronization() {
  const apolloClient = useApolloClient();
  const addFetchResultErrorHandler = useAddFetchResultErrorHandler();
  const [syncSessions] = useMutation(SYNC_SESSIONS);
  const showAlert = useSnackbarAlert();
  const showError = useSnackbarError();

  useEffect(() => {
    return addFetchResultErrorHandler(async (_value, firstError, context) => {
      const code = firstError.extensions.code;
      if (code === GraphQLErrorCode.Unauthenticated) {
        const reason = firstError.extensions.reason;
        if (
          reason === AuthenticationFailedReason.SessionExpired ||
          reason === AuthenticationFailedReason.UserNoSession
        ) {
          // Mark current user session expired
          const currentUserId = getCurrentUserId(apolloClient.cache);
          if (currentUserId) {
            apolloClient.cache.writeQuery({
              query: QUERY_CURRENT_USER,
              data: {
                currentSignedInUser: {
                  id: currentUserId,
                  isSessionExpired: true,
                },
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
          const signedInUserIds =
            apolloClient.cache
              .readQuery({
                query: QUERY_USERS,
              })
              ?.signedInUsers.map(({ id }) => String(id)) ?? [];

          const { data, errors } = await syncSessions({
            variables: {
              input: {
                availableUserIds: signedInUserIds,
              },
            },
            context,
          });

          if (data) {
            const actualAvailableUserIds = data.syncSessionCookies.availableUserIds;

            // Mark not available users as expired
            apolloClient.cache.updateQuery(
              {
                query: QUERY_USERS,
              },
              (data) => {
                if (!data) return;

                return {
                  signedInUsers: data.signedInUsers.map(({ id }) => ({
                    id,
                    isSessionExpired: !actualAvailableUserIds.includes(String(id)),
                  })),
                };
              }
            );
          } else if (errors?.[0]) {
            showError(errors[0].message);
          }
          return true;
        }
      }
      return false;
    });
  }, [apolloClient, addFetchResultErrorHandler, showAlert, showError, syncSessions]);

  return null;
}
