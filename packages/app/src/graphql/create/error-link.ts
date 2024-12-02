import { onError } from '@apollo/client/link/error';
import {
  AuthenticationFailedReason,
  GraphQLErrorCode,
} from '~api-app-shared/graphql/error-codes';
import { getOperationOrRequestUserId } from '../link/current-user';
import { AppContext } from '../types';
import { ApolloClient } from '@apollo/client';
import { mutate } from '../utils/mutate';
import { SyncSessionCookies } from '../../user/mutations/SyncSessionCookies';
import { MutationUpdaterFunctionMap } from './mutation-updater-map';
import { setUserSessionExpired } from '../../user/models/signed-in-user/set-session-expired';
import { addUserMessages } from '../../user/models/message/add';
import { isDefined } from '~utils/type-guards/is-defined';
import { GateController } from '../link/gate';
import { UserMessageType } from '../../__generated__/graphql';

export function createErrorLink({
  client,
  mutationUpdaterFnMap,
  appContext,
  getUserGate,
  generateMessageId = crypto.randomUUID.bind(crypto),
}: {
  client: ApolloClient<object>;
  mutationUpdaterFnMap: Pick<MutationUpdaterFunctionMap, 'get'>;
  appContext: Pick<AppContext, 'userId'>;
  getUserGate: (userId: string) => Pick<GateController, 'open' | 'close'>;
  generateMessageId?: () => string;
}) {
  return onError(({ graphQLErrors = [], operation, forward }) => {
    const operationUserId = getOperationOrRequestUserId(operation);

    const unauthenticatedReasons = new Set(
      graphQLErrors
        .map((err) => {
          const code = err.extensions.code;
          const reason = err.extensions.reason;

          if (code != null) {
            return reason as AuthenticationFailedReason;
          }
          return;
        })
        .filter(isDefined)
    );

    const hasUnauthenticatedError = unauthenticatedReasons.size > 0;
    // Prevent user from fetching on unauthentication error
    if (hasUnauthenticatedError && operationUserId != null) {
      const gate = getUserGate(operationUserId);
      gate.close();

      setUserSessionExpired(operationUserId, true, client.cache);
      addUserMessages(
        operationUserId,
        [
          {
            id: generateMessageId(),
            type: UserMessageType.WARNING,
            text: 'Current session has expired! Please sign in.',
          },
        ],
        client.cache
      );
    }

    // Cookies has invalid sessions, must sync it with server
    if (unauthenticatedReasons.has(AuthenticationFailedReason.USER_UNDEFINED)) {
      void mutate(SyncSessionCookies, {
        client,
        getMutationUpdaterFn: mutationUpdaterFnMap.get,
      });
    }

    const userId = operationUserId ?? appContext.userId;
    if (!userId) {
      throw new Error('Expected userId to be defined to show GraphQL errors');
    }

    // By default write message to cache and then it will be shown to user
    graphQLErrors.forEach(({ message, extensions: { code } }) => {
      if (code !== GraphQLErrorCode.UNAUTHENTICATED) {
        addUserMessages(
          userId,
          [
            {
              type: UserMessageType.ERROR,
              id: generateMessageId(),
              text: message,
            },
          ],
          client.cache
        );
      }
    });

    return hasUnauthenticatedError && operationUserId != null
      ? forward(operation)
      : undefined;
  });
}