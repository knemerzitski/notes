/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApolloClient,
  ApolloLink,
  FetchResult,
  gql,
  InMemoryCache,
  NextLink,
  Observable,
  Operation,
} from '@apollo/client';
import { MockedResponse, MockLink } from '@apollo/client/testing';
import { it, vi, expect } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { GraphQLError } from 'graphql';
import { PersistLink } from '.';
import { addTypePolicies, createTypePolicies } from '../../create/type-policies';
import { graphQLPolicies } from '../../policies';
import { resumeOngoingOperations } from './resume';
import { GateLink } from '../gate';

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
      variables: {
        graphQLError: true,
      },
    },
    result: {
      errors: [new GraphQLError('err')],
    },
  },
  {
    request: {
      query: Mutation,
      variables: {
        networkError: true,
      },
    },
    error: new Error('err'),
  },
];

it('stores mutation in cache on network error', async () => {
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
  } catch (err) {
    // ignore error
  }

  expect(cache.extract()).toMatchInlineSnapshot(`
    {
      "ApolloOperation:fooId": {
        "__typename": "ApolloOperation",
        "context": "{"persistId":"fooId","forceFetch":true,"clientAwareness":{}}",
        "id": "fooId",
        "operationName": "Foo",
        "query": "{"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Foo"},"variableDefinitions":[],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"foo"},"arguments":[],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bar"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}}]}}],"loc":{"start":0,"end":50}}",
        "variables": "{"networkError":true}",
      },
      "ROOT_QUERY": {
        "__typename": "Query",
        "ongoingOperations": {
          "fooId": {
            "__ref": "ApolloOperation:fooId",
          },
        },
      },
    }
  `);
});

it('no mutation in cache on successful response', async () => {
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

  await client.mutate({
    mutation: Mutation,
    context: {
      [PersistLink.PERSIST]: true,
    },
  });

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
});

it('no mutation in cache on GraphQL error', async () => {
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
        graphQLError: true,
      },
      context: {
        [PersistLink.PERSIST]: true,
      },
    });
  } catch (err) {
    //Ignore error
  }

  expect(cache.extract()).toMatchInlineSnapshot(`
    {
      "ROOT_QUERY": {
        "__typename": "Query",
        "ongoingOperations": {},
      },
    }
  `);
});

it('will not forward more than one mutation with same id', () => {
  const cache = new InMemoryCache();
  addTypePolicies(createTypePolicies([graphQLPolicies], mock()), cache);

  class OngoingIdsLink extends ApolloLink {
    readonly forwardedIds: string[] = [];

    override request(
      operation: Operation,
      forward?: NextLink
    ): Observable<FetchResult> | null {
      if (!forward) {
        return null;
      }

      const id = operation.getContext()[PersistLink.PERSIST] as string;
      this.forwardedIds.push(id);

      return forward(operation);
    }
  }

  const persistLink = new PersistLink(cache);
  const ongoingIdsLink = new OngoingIdsLink();
  const gateLink = new GateLink();
  const client = new ApolloClient({
    cache,
    link: ApolloLink.from([persistLink, ongoingIdsLink, gateLink]),
  });

  const gate = gateLink.create();
  gate.close();

  void client.mutate({
    mutation: Mutation,
    context: {
      [PersistLink.PERSIST]: '1',
    },
  });

  void Promise.allSettled([
    ...resumeOngoingOperations(client, () => undefined),
    ...resumeOngoingOperations(client, () => undefined),
  ]);

  expect(
    ongoingIdsLink.forwardedIds,
    'There should be exatcly one mutation with same persist id'
  ).toHaveLength(1);
});

it('returns same response for an operation with same id', async () => {
  const cache = new InMemoryCache();
  addTypePolicies(createTypePolicies([graphQLPolicies], mock()), cache);

  const persistLink = new PersistLink(cache);
  const client = new ApolloClient({
    cache,
    link: ApolloLink.from([
      persistLink,
      new MockLink([
        {
          request: {
            query: Mutation,
          },
          result: {
            data: {
              foo: {
                bar: 'hi',
              },
            },
          },
        },
      ]),
    ]),
  });

  const r1 = client.mutate({
    mutation: Mutation,
    context: {
      [PersistLink.PERSIST]: '1',
    },
  });
  const r2 = client.mutate({
    mutation: Mutation,
    context: {
      [PersistLink.PERSIST]: '1',
    },
  });

  const result = await Promise.all([r1, r2]);

  expect(result[0]).toEqual(result[1]);
});
