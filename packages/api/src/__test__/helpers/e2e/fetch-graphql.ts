/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FormattedExecutionResult } from 'graphql';

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
): Promise<{ result: FormattedExecutionResult<TData>; response: Response }> {
  const response = await fetchFn(HTTP_URL, {
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
    result: (await response.json()) as FormattedExecutionResult<TData>,
    response,
  };
}
