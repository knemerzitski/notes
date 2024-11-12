/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { GraphQLResponse, HeaderMap } from '@apollo/server';
import { FormattedExecutionResult } from 'graphql/index.js';

const HTTP_URL = process.env.VITE_GRAPHQL_HTTP_URL!;

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export async function fetchGraphQL<
  TData = Record<string, unknown>,
  TVariables extends { [name: string]: any } = { [name: string]: any },
>(
  request: {
    operationName?: string;
    query?: string;
    variables?: TVariables;
  },
  fetchFn: FetchFn = fetch
) {
  const httpResponse = await fetchFn(HTTP_URL, {
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
    graphQLResponse: {
      body: {
        kind: 'single',
        singleResult: (await httpResponse.json()) as FormattedExecutionResult<TData>,
      },
      http: {
        headers: new HeaderMap(httpResponse.headers.entries()),
        status: httpResponse.status,
      },
    } satisfies GraphQLResponse<TData>,
    httpResponse,
  };
}
