/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { MockedResponse, MockLink } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { it, vi, expect } from 'vitest';

import { StatsLink } from './stats';

const Query = gql(`
  query Foo {
    foo {
      bar
    }
  }  
`);

const Mutation = gql(`
  mutation Foo {
    foo
  }  
`);

const mocks: MockedResponse<any, any>[] = [
  {
    request: {
      query: Query,
    },
    result: {
      data: {
        foo: {
          bar: 'foobar',
        },
      },
    },
  },
  {
    request: {
      query: Mutation,
    },
    result: {
      data: {
        foo: 'bar',
      },
    },
  },
  {
    request: {
      query: Mutation,
      variables: {
        graphQLError: true,
      },
    },
    result: {
      errors: [new GraphQLError('validation err')],
    },
  },
  {
    request: {
      query: Mutation,
      variables: {
        networkError: true,
      },
    },
    error: new Error('network err'),
  },
];

it('calls events with correct stats', async () => {
  const mockLink = new MockLink(mocks);
  const statsLink = new StatsLink();

  const onFn = vi.fn();
  statsLink.getUserEventBus(undefined).on('*', onFn);

  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: statsLink.concat(mockLink),
  });

  await client.query({
    query: Query,
  });
  await client.mutate({
    mutation: Mutation,
  });
  try {
    await client.mutate({
      mutation: Mutation,
      variables: {
        graphQLError: true,
      },
      errorPolicy: 'none',
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    // Ignore error
  }
  try {
    await client.mutate({
      mutation: Mutation,
      variables: {
        networkError: true,
      },
      errorPolicy: 'none',
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    // Ignore error
  }

  expect(onFn.mock.calls).toMatchInlineSnapshot(`
    [
      [
        "byType",
        {
          "ongoingCount": 1,
          "type": "query",
        },
      ],
      [
        "byName",
        {
          "ongoingCount": 1,
          "operationName": "Foo",
        },
      ],
      [
        "byType",
        {
          "ongoingCount": 0,
          "type": "query",
        },
      ],
      [
        "byName",
        {
          "ongoingCount": 0,
          "operationName": "Foo",
        },
      ],
      [
        "byType",
        {
          "ongoingCount": 1,
          "type": "mutation",
        },
      ],
      [
        "byName",
        {
          "ongoingCount": 1,
          "operationName": "Foo",
        },
      ],
      [
        "byType",
        {
          "ongoingCount": 0,
          "type": "mutation",
        },
      ],
      [
        "byName",
        {
          "ongoingCount": 0,
          "operationName": "Foo",
        },
      ],
      [
        "byType",
        {
          "ongoingCount": 1,
          "type": "mutation",
        },
      ],
      [
        "byName",
        {
          "ongoingCount": 1,
          "operationName": "Foo",
        },
      ],
      [
        "byType",
        {
          "ongoingCount": 0,
          "type": "mutation",
        },
      ],
      [
        "byName",
        {
          "ongoingCount": 0,
          "operationName": "Foo",
        },
      ],
      [
        "byType",
        {
          "ongoingCount": 1,
          "type": "mutation",
        },
      ],
      [
        "byName",
        {
          "ongoingCount": 1,
          "operationName": "Foo",
        },
      ],
      [
        "byType",
        {
          "ongoingCount": 0,
          "type": "mutation",
        },
      ],
      [
        "byName",
        {
          "ongoingCount": 0,
          "operationName": "Foo",
        },
      ],
    ]
  `);
});
