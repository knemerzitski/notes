import './apollo/dev';

import { getCurrentSignedInUserId } from '../user/signed-in-user';
import possibleTypes from '../__generated__/possible-types.json';
import { userPolicies } from '../user/policies';
import { TypePoliciesList } from './types';
import { createGraphQLService } from './service';

const HTTP_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_HTTP_URL
    : `${location.origin}/graphql`;

const WS_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_WS_URL
    : `ws://${location.host}/graphql-ws`;

const TYPE_POLICIES_LIST: TypePoliciesList = [userPolicies];

export function createDefaultGraphQLServiceParams(): Parameters<
  typeof createGraphQLService
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

export function createDefaultGraphQLService() {
  return createGraphQLService(createDefaultGraphQLServiceParams());
}
