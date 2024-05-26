import { ApolloCache, useSuspenseQuery } from '@apollo/client';
import { gql } from '../../../__generated__';
import { UseCurrentUserIdQuery } from '../../../__generated__/graphql';
import { DeepPartial } from '@apollo/client/utilities';

const QUERY = gql(`
  query UseCurrentUserId {
    signedInUsers @client {
      id
      isSessionExpired
    }
    currentSignedInUser @client {
      id
    }
  }
`);

export default function useCurrentUserId(): string | undefined {
  const { data } = useSuspenseQuery(QUERY, {
    returnPartialData: true,
  });
  return findAvailableUserId(data);
}

export function getCurrentUserId<TCacheShape>(
  cache: ApolloCache<TCacheShape>
): string | undefined {
  const data = cache.readQuery({
    query: QUERY,
    returnPartialData: true,
  });
  if (!data) return;
  return findAvailableUserId(data);
}

function findAvailableUserId(data: DeepPartial<UseCurrentUserIdQuery>) {
  let currentId = data.currentSignedInUser?.id;
  if (!currentId) {
    const firstUser =
      data.signedInUsers?.find((user) => !user?.isSessionExpired) ??
      data.signedInUsers?.[0];
    if (firstUser) {
      currentId = firstUser.id;
    }
  }
  return currentId ? String(currentId) : undefined;
}
