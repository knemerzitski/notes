/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { MockedResponse, MockLink } from '@apollo/client/testing';
import { it, vi, expect } from 'vitest';
import { StatsLink } from './stats';

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

  expect(onFn.mock.calls).toStrictEqual([
    ['query', { ongoing: 1, total: 1 }],
    ['query', { ongoing: 0, total: 1 }],
    ['mutation', { ongoing: 1, total: 1 }],
    ['mutation', { ongoing: 0, total: 1 }],
  ]);
});
