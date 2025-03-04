import { ApolloClient } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { nanoid } from 'nanoid';

import { AuthenticationFailedReason, GraphQLErrorCode } from '../../../../api-app-shared/src/graphql/error-codes';

import { UserMessageType } from '../../__generated__/graphql';
import { addUserMessages } from '../../user/models/message/add';
import { setUserSessionExpired } from '../../user/models/signed-in-user/set-session-expired';
import { SyncSessionCookies } from '../../user/mutations/SyncSessionCookies';
import { GateController } from '../link/gate';
import { findOperationUserIds } from '../utils/find-operation-user-id';
import { mutate } from '../utils/mutate';

import { MutationUpdaterFunctionMap } from './mutation-updater-map';

export function createErrorLink({
  client,
  mutationUpdaterFnMap,
  getUserGate,
  generateMessageId = nanoid,
}: {
  client: ApolloClient<object>;
  mutationUpdaterFnMap: Pick<MutationUpdaterFunctionMap, 'get'>;
  getUserGate: (userId: string) => Pick<GateController, 'open' | 'close'>;
  generateMessageId?: () => string;
}) {
  return onError(({ graphQLErrors = [], operation, forward }) => {
    const unauthenticatedUserIds = new Set<string>();
    const unauthenticatedReasons = new Set<AuthenticationFailedReason>();
    graphQLErrors.forEach((err) => {
      const userIdsAffectedByError = findOperationUserIds(operation, err.path);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const code = err.extensions?.code;
      if (code === GraphQLErrorCode.UNAUTHENTICATED) {
        userIdsAffectedByError.forEach((userId) => {
          unauthenticatedUserIds.add(userId);
        });

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const reason = err.extensions?.reason;
        if (reason) {
          unauthenticatedReasons.add(reason as AuthenticationFailedReason);
        }
      } else {
        if (userIdsAffectedByError.length === 0) {
          throw new Error('Expected find userId in operation to show GraphQL errors');
        }

        const context = operation.getContext();
        const skipMessage = context.skipAddUserMessageOnError ?? false;

        if (!skipMessage) {
          // By default write message to cache and then it will be shown to user
          userIdsAffectedByError.forEach((userId) => {
            addUserMessages(
              userId,
              [
                {
                  type: UserMessageType.ERROR,
                  id: generateMessageId(),
                  text: err.message,
                },
              ],
              client.cache
            );
          });
        }
      }
    });

    for (const sessionExpireUserId of unauthenticatedUserIds.values()) {
      // Prevent user from fetching on unauthentication error
      const gate = getUserGate(sessionExpireUserId);
      gate.close();

      setUserSessionExpired(sessionExpireUserId, true, client.cache);
      addUserMessages(
        sessionExpireUserId,
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

    const hasUserWithUnauthenticatedErrors =
      unauthenticatedReasons.size > 0 && unauthenticatedUserIds.size > 0;

    if (hasUserWithUnauthenticatedErrors) {
      return forward(operation);
    }

    return;
  });
}
