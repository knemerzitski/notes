import { createApolloClient } from './init/create-apollo-client';
import possibleTypes from '../__generated__/possibleTypes.json';
import { TypePoliciesList } from './types';
import { getCurrentSignedInUserId } from '../user/signed-in-user';
import { userPolicies } from '../user/policies';

const HTTP_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_HTTP_URL
    : `${location.origin}/graphql`;

const WS_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_WS_URL
    : `ws://${location.host}/graphql-ws`;

const TYPE_POLICIES_LIST: TypePoliciesList = [userPolicies];

export function createDefaultApolloClientParams(): Parameters<
  typeof createApolloClient
>[0] {
  return {
    httpUri: HTTP_URL,
    wsUrl: WS_URL,
    possibleTypes,
    typePoliciesList: TYPE_POLICIES_LIST,
    context: {
      getUserId: getCurrentSignedInUserId,
    },
  };
}
