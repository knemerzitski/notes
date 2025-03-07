import { apolloFetchGraphQL } from '../../../../../utils/src/testing/apollo-fetch-graphql';
import { nodeFetch } from '../../../../../utils/src/testing/node-fetch';
import { PartialBy } from '../../../../../utils/src/types';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const HTTP_URL = process.env.VITE_GRAPHQL_HTTP_URL!;

type FetchFn = (
  input: string | URL | Request,
  init?: Omit<RequestInit, 'headers'> & {
    readonly headers: Record<string, string>;
  }
) => Promise<Response>;

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
    url: HTTP_URL,
  });
}
