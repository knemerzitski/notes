import { FormattedExecutionResult } from 'graphql/index.js';

import { FetchFn, GraphQLRequest } from './types';

export async function fetchGraphQL<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = Record<string, any>,
  TExtensions = Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style, @typescript-eslint/no-explicit-any
  TVariables extends { [name: string]: any } = { [name: string]: any },
>(
  request: GraphQLRequest<TVariables>,
  options: {
    fetchFn: FetchFn;
    url: string;
  }
) {
  const fetchFn = options.fetchFn;
  const url = options.url;

  const response = await fetchFn({
    url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operationName: request.operationName,
      variables: request.variables,
      query: request.query,
    }),
  });

  return {
    body: (await response.json()) as FormattedExecutionResult<TData, TExtensions>,
    response,
  };
}
