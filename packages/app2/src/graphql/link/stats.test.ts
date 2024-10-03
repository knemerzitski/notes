/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { MockedResponse, MockLink } from '@apollo/client/testing';
import { it, vi, expect } from 'vitest';
import { StatsLink } from './stats';
import { GraphQLError } from 'graphql';

const QUERY = gql(`
  query Foo {
    foo {
      bar
    }
  }  
`);

const MUTATION = gql(`
  mutation Foo {
    foo
  }  
`);

const mocks: MockedResponse<any, any>[] = [
  {
    request: {
      query: QUERY,
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
      query: MUTATION,
    },
    result: {
      data: {
        foo: 'bar',
      },
    },
  },
  {
    request: {
      query: MUTATION,
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
      query: MUTATION,
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
  statsLink.eventBus.on('*', onFn);

  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: statsLink.concat(mockLink),
  });

  await client.query({
    query: QUERY,
  });
  await client.mutate({
    mutation: MUTATION,
  });
  try {
    await client.mutate({
      mutation: MUTATION,
      variables: {
        graphQLError: true,
      },
      errorPolicy: 'none',
    });
  } catch (err) {
    // Ignore error
  }
  try {
    await client.mutate({
      mutation: MUTATION,
      variables: {
        networkError: true,
      },
      errorPolicy: 'none',
    });
  } catch (err) {
    // Ignore error
  }

  expect(onFn.mock.calls).toStrictEqual([
    ['query', { ongoing: 1, total: 1 }],
    ['query', { ongoing: 0, total: 1 }],
    ['mutation', { ongoing: 1, total: 1 }],
    ['mutation', { ongoing: 0, total: 1 }],
    ['mutation', { ongoing: 1, total: 2 }],
    ['mutation', { ongoing: 0, total: 2 }],
    ['mutation', { ongoing: 1, total: 3 }],
    ['mutation', { ongoing: 0, total: 3 }],
  ]);
});
