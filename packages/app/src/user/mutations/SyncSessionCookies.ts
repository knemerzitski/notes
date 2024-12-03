import { ApolloCache } from '@apollo/client';

import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { getUserIds } from '../models/signed-in-user/get-ids';
import { setUserSessionExpired } from '../models/signed-in-user/set-session-expired';

export const SyncSessionCookies = mutationDefinition(
  gql(`
  mutation SyncSessionCookies($input: SyncSessionCookiesInput!) @noauth {
    syncSessionCookies(input: $input) {
      availableUserIds
    }
  }
`),
  (cache, result, { context }) => {
    const data = result.data;
    if (!data) return;

    const currentUserIds = getUserIds(cache);
    const availableUserIds = data.syncSessionCookies.availableUserIds;
    for (const userId of currentUserIds) {
      if (!availableUserIds.includes(userId)) {
        // Mark user session expired if's no longer available
        setUserSessionExpired(userId, true, cache);

        if (context?.getUserGate) {
          const gate = context.getUserGate(userId);
          gate.close();
        }
      }
    }
  }
);

export function syncSessionCookiesVariables(
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  return {
    input: {
      availableUserIds: getUserIds(cache),
    },
  };
}
