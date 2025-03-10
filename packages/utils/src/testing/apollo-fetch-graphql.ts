import { GraphQLResponse, HeaderMap } from '@apollo/server';

import { fetchGraphQL } from './fetch-graphql';

export async function apolloFetchGraphQL<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style, @typescript-eslint/no-explicit-any
  TVariables extends { [name: string]: any } = { [name: string]: any },
>(...args: Parameters<typeof fetchGraphQL<TData, TVariables>>) {
  const { body, response } = await fetchGraphQL<TData, TVariables>(...args);

  return {
    graphQLResponse: {
      body: {
        kind: 'single',
        singleResult: body,
      },
      http: {
        headers: new HeaderMap(response.headers.entries),
        status: response.status,
      },
    } satisfies GraphQLResponse<TData>,
    response,
  };
}
