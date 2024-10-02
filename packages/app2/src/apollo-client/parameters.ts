import { getCurrentSignedInUserId } from '~/auth/signed-in-user';
import { createApolloClient } from './init/create-apollo-client';
import { TypePoliciesList } from './init/create-type-policies';

const HTTP_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_HTTP_URL
    : `${location.origin}/graphql`;

const WS_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_WS_URL
    : `ws://${location.host}/graphql-ws`;

const TYPE_POLICIES_LIST: TypePoliciesList = [
  // TODO add type policies here
];

export function createDefaultApolloClientParams(): Parameters<
  typeof createApolloClient
>[0] {
  return {
    httpUri: HTTP_URL,
    wsUrl: WS_URL,
    typePoliciesList: TYPE_POLICIES_LIST,
    context: {
      getUserId: getCurrentSignedInUserId,
    },
  };
}
