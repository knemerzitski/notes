/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloClient, ApolloLink, gql, InMemoryCache } from '@apollo/client';
import { MockedResponse, MockLink } from '@apollo/client/testing';
import { it, vi, expect } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { addTypePolicies, createTypePolicies } from '../../create/type-policies';
import { graphQLPolicies } from '../../policies';

import { resumeOngoingOperations } from './resume';

import { PersistLink } from '.';

const Mutation = gql(`
  mutation Foo {
    foo {
      bar
    }
  }  
`);

const mocks: MockedResponse<any, any>[] = [
  {
    request: {
      query: Mutation,
      variables: {
        networkError: true,
      },
    },
    error: new Error('err'),
  },
  {
    request: {
      query: Mutation,
      variables: {
        networkError: true,
      },
    },
    result: {
      data: {
        foo: {
          __typename: 'Bar',
          bar: 'foobar',
        },
      },
    },
  },
];

it('resumes cached error and calls updateFn', async () => {
  const generateId = vi.fn();
  generateId.mockImplementationOnce(() => 'fooId');

  const cache = new InMemoryCache();
  addTypePolicies(createTypePolicies([graphQLPolicies], mock()), cache);

  const mockLink = new MockLink(mocks);
  const persistLink = new PersistLink(cache, {
    generateId: generateId,
  });
  const client = new ApolloClient({
    cache,
    link: ApolloLink.from([persistLink, mockLink]),
  });

  try {
    await client.mutate({
      mutation: Mutation,
      variables: {
        networkError: true,
      },
      context: {
        [PersistLink.PERSIST]: true,
      },
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    // ignore error
  }

  const mutationUpdateFn = vi.fn();

  await Promise.allSettled(resumeOngoingOperations(client, () => mutationUpdateFn));

  expect(cache.extract()).toMatchInlineSnapshot(`
    {
      "ROOT_MUTATION": {
        "__typename": "Mutation",
      },
      "ROOT_QUERY": {
        "__typename": "Query",
        "ongoingOperations": {},
      },
    }
  `);

  expect(mutationUpdateFn).toHaveBeenCalledOnce();
});
