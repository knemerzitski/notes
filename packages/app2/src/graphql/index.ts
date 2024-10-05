import './dev';

import { getCurrentSignedInUserId } from '../user/utils/signed-in-user';
import possibleTypes from '../__generated__/possible-types.json';
import { userEvictOptions, userPolicies } from '../user/policies';
import { TypePoliciesList, UpdateHandlersByName } from './types';
import { createGraphQLService } from './service';
import { graphQLPolicies } from './policies';
import { TaggedEvictOptionsList } from './utils/tagged-evict';

const HTTP_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_HTTP_URL
    : `${location.origin}/graphql`;

const WS_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_WS_URL
    : `ws://${location.host}/graphql-ws`;

const TYPE_POLICIES_LIST: TypePoliciesList = [graphQLPolicies, userPolicies];

const EVICT_OPTIONS_LIST: TaggedEvictOptionsList = [...userEvictOptions];

const UPDATE_HANDLER_BY_NAME: UpdateHandlersByName = {
  // TODO add mutation update handlers here...
};

export function createDefaultGraphQLServiceParams(): Parameters<
  typeof createGraphQLService
>[0] {
  return {
    httpUri: HTTP_URL,
    wsUrl: WS_URL,
    possibleTypes,
    typePoliciesList: TYPE_POLICIES_LIST,
    evictOptionsList: EVICT_OPTIONS_LIST,
    updateHandlersByName: UPDATE_HANDLER_BY_NAME,
    context: {
      getUserId: getCurrentSignedInUserId,
    },
  };
}

export function createDefaultGraphQLService() {
  return createGraphQLService(createDefaultGraphQLServiceParams());
}
