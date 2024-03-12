import { useMutation, useSuspenseQuery } from '@apollo/client';
import { useEffect } from 'react';

import {
  AuthenticationFailedReason,
  GraphQLErrorCode,
} from '~api-app-shared/graphql/error-codes';

import { gql } from '../../__generated__/gql';
import useAddFetchResultErrorHandler from '../../apollo/hooks/useAddFetchResultErrorHandler';
import {
  useSnackbarAlert,
  useSnackbarError,
} from '../../components/feedback/SnackbarAlertProvider';
import useNavigateToSession from '../hooks/useNavigateToSession';
import useSessionMutations from '../state/useSessionMutations';

const SYNC_SESSIONS = gql(`
  mutation SessionSynchronizationSyncSessions($input: SyncSessionsInput!) {
    syncSessions(input: $input) {
      __typename
      ... on SyncSessionsSignInPayload {
        currentSessionKey
        availableSessionKeys
      }
      ... on SyncSessionsSignOutPayload {
        signedOut
      }
    }
  }
`);

const QUERY = gql(`
  query SessionSynchronization {
    currentSavedSession @client {
      key
      displayName
      email
      isExpired
      authProviderId
    }
  }
`);

/**
 * Synchronizes session between local state and server. Marks sessions expired.
 */
export default function SessionSynchronization() {
  const addHandler = useAddFetchResultErrorHandler();
  const { availableSessionKeys, updateSession, clearSessions, filterSessions } =
    useSessionMutations();

  const localSwitchToSession = useNavigateToSession();

  const {
    data: { currentSavedSession: currentSession },
  } = useSuspenseQuery(QUERY);

  const [syncSessions] = useMutation(SYNC_SESSIONS);

  const showAlert = useSnackbarAlert();
  const showError = useSnackbarError();

  useEffect(() => {
    return addHandler(async (_value, firstError, context) => {
      const code = firstError.extensions.code;
      if (code === GraphQLErrorCode.Unauthenticated) {
        const reason = firstError.extensions.reason;
        if (reason === AuthenticationFailedReason.SessionExpired) {
          if (currentSession) {
            updateSession({
              ...currentSession,
              isExpired: true,
            });
          }

          showAlert({
            severity: 'warning',
            children: <>Current session has expired! Please sign in again.</>,
            snackbarProps: {
              anchorOrigin: { vertical: 'top', horizontal: 'center' },
            },
          });
          return true;
        } else {
          const { data, errors } = await syncSessions({
            variables: {
              input: {
                availableSessionKeys: availableSessionKeys(),
              },
            },
            context,
          });

          if (data) {
            if (data.syncSessions.__typename === 'SyncSessionsSignInPayload') {
              // Update sessions in localStorage
              const { currentSessionKey, availableSessionKeys } = data.syncSessions;

              filterSessions(availableSessionKeys);

              await localSwitchToSession(currentSessionKey);
            } else {
              // Signed out, delete all sessions
              clearSessions();
            }
          } else if (errors?.[0]) {
            showError(errors[0].message);
          }
          return true;
        }
      }
      return false;
    });
  }, [
    currentSession,
    localSwitchToSession,
    updateSession,
    clearSessions,
    filterSessions,
    showAlert,
    showError,
    addHandler,
    syncSessions,
    availableSessionKeys,
  ]);

  return null;
}
