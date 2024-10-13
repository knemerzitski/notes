/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { MockedResponse, MockLink } from '@apollo/client/testing';
import { it, vi, expect } from 'vitest';
import { ErrorLink } from './error';
import { GraphQLError } from 'graphql';

const Mutation = gql(`
  mutation Foo {
    foo
  }  
`);

const mocks: MockedResponse<any, any>[] = [
  {
    request: {
      query: Mutation,
    },
    result: {
      errors: [
        new GraphQLError('Resource not found', {
          extensions: {
            code: 'NOT_FOUND',
          },
        }),
      ],
    },
  },
];

it('emits error', async () => {
  const mockLink = new MockLink(mocks);
  const errorLink = new ErrorLink();

  const onErrorFn = vi.fn();
  errorLink.eventBus.on('error', onErrorFn);

  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: errorLink.concat(mockLink),
  });

  await client.mutate({
    mutation: Mutation,
    errorPolicy: 'all',
  });

  expect(onErrorFn).toHaveBeenCalledWith({
    value: expect.any(Object),
    firstError: expect.any(GraphQLError),
    context: expect.any(Object),
    handled: false,
  });
});

it('skips emitting error code specified in context', async () => {
  const mockLink = new MockLink(mocks);
  const errorLink = new ErrorLink();

  const onErrorFn = vi.fn();
  errorLink.eventBus.on('error', onErrorFn);

  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: errorLink.concat(mockLink),
  });

  await client.mutate({
    mutation: Mutation,
    errorPolicy: 'all',
    context: {
      [ErrorLink.NO_EMIT]: ['NOT_FOUND'],
    },
  });

  expect(onErrorFn, 'Error should have not been emitted').not.toHaveBeenCalled();
});
