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
import QueueLink from 'apollo-link-queue';

const MUTATION = gql(`
  mutation Foo {
    foo {
      bar
    }
  }  
`);

const mocks: MockedResponse<any, any>[] = [
  {
    request: {
      query: MUTATION,
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
      query: MUTATION,
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
      mutation: MUTATION,
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
        "context": "{"_PersistLink-persist":"fooId","forceFetch":true,"clientAwareness":{}}",
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
    mutation: MUTATION,
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
      mutation: MUTATION,
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

it('ignores ongoing mutation with duplicate persist id', () => {
  const cache = new InMemoryCache();
  addTypePolicies(createTypePolicies([graphQLPolicies], mock()), cache);

  class OngoingIdsLink extends ApolloLink {
    readonly ongoingIds: string[] = [];

    override request(
      operation: Operation,
      forward?: NextLink
    ): Observable<FetchResult> | null {
      if (!forward) {
        return null;
      }

      const id = operation.getContext()[PersistLink.PERSIST];

      return new Observable((observer) => {
        this.ongoingIds.push(id);
        const sub = forward(operation).subscribe(observer);
        return () => {
          const idx = this.ongoingIds.indexOf(id);
          if (idx != -1) {
            this.ongoingIds.splice(idx, 1);
          }
          sub.unsubscribe();
        };
      });
    }
  }

  const persistLink = new PersistLink(cache);
  const ongoingIdsLink = new OngoingIdsLink();
  const queueLink = new QueueLink();
  const client = new ApolloClient({
    cache,
    link: ApolloLink.from([persistLink, ongoingIdsLink, queueLink]),
  });

  queueLink.close();

  void client.mutate({
    mutation: MUTATION,
    context: {
      [PersistLink.PERSIST]: true,
    },
  });

  void Promise.allSettled([
    ...resumeOngoingOperations(client, {}),
    ...resumeOngoingOperations(client, {}),
  ]);

  expect(
    ongoingIdsLink.ongoingIds,
    'There should not be running more than 1 mutation with same persist id'
  ).toHaveLength(1);
});
