import { apolloFetchGraphQL } from '../../../../../utils/src/testing/apollo-fetch-graphql';
import { nodeFetch } from '../../../../../utils/src/testing/node-fetch';
import { PartialBy } from '../../../../../utils/src/types';

export type FetchFn = (options: {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body: string | null;
}) => Promise<{
  json: () => Promise<unknown>;
  headers: {
    entries: readonly [string, string][];
    getSetCookie: () => string[];
  };
  status?: number;
}>;

export async function fetchGraphQL<
  TData = Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters, @typescript-eslint/consistent-indexed-object-style, @typescript-eslint/no-explicit-any
  TVariables extends { [name: string]: any } = { [name: string]: any },
>(
  request: Parameters<typeof apolloFetchGraphQL<TData, TVariables>>[0],
  ctx: PartialBy<
    Omit<Parameters<typeof apolloFetchGraphQL<TData, TVariables>>[1], 'url'>,
    'fetchFn'
  >
) {
  return apolloFetchGraphQL<TData, TVariables>(request, {
    fetchFn: ctx.fetchFn ?? nodeFetch,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    url: process.env.VITE_GRAPHQL_HTTP_URL!,
  });
}
