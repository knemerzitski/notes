import { gql, ApolloLink, InMemoryCache, ApolloClient } from '@apollo/client';
import { expect, it, vi } from 'vitest';
import { Observable } from 'zen-observable-ts';

import { apolloClientSubscribe } from './apollo-client-subscribe';

it('returns value that has been processed by type policies', async () => {
  const SUBSCRIPTION = gql`
    subscription Test {
      valueType {
        value
      }
    }
  `;

  const onNextFn = vi.fn();

  const mockLink = new ApolloLink((_op) => {
    return new Observable((observer) => {
      observer.next({
        data: {
          valueType: {
            __typename: 'ValueType',
            value: 2,
          },
        },
      });
      observer.next({
        data: {
          valueType: {
            __typename: 'ValueType',
            value: 3,
          },
        },
      });
      observer.complete();
    });
  });

  const cache = new InMemoryCache({
    typePolicies: {
      ValueType: {
        fields: {
          value: {
            merge(_existing, incoming: number) {
              return incoming * 2;
            },
          },
        },
      },
    },
  });
  const client = new ApolloClient({
    cache,
    link: mockLink,
  });
  const observable = apolloClientSubscribe(client, {
    query: SUBSCRIPTION,
  });

  observable.subscribe(onNextFn);

  await new Promise(process.nextTick.bind(process));

  expect(onNextFn).toHaveBeenNthCalledWith(1, {
    data: {
      valueType: {
        __typename: 'ValueType',
        value: 4,
      },
    },
  });
  expect(onNextFn).toHaveBeenNthCalledWith(2, {
    data: {
      valueType: {
        __typename: 'ValueType',
        value: 6,
      },
    },
  });
});

it('keeps variables', async () => {
  const SUBSCRIPTION = gql`
    subscription Test($id: String!) {
      valueType(id: $id) {
        value
      }
    }
  `;

  const onNextFn = vi.fn();

  const mockLink = new ApolloLink((_op) => {
    return new Observable((observer) => {
      observer.next({
        data: {
          valueType: {
            __typename: 'ValueType',
            value: 5,
          },
        },
      });
      observer.complete();
    });
  });

  const cache = new InMemoryCache({
    typePolicies: {
      ValueType: {
        fields: {
          value: {
            merge(_existing, incoming: number, { variables }) {
              return String(variables?.id) + String(incoming * 2);
            },
          },
        },
      },
    },
  });
  const client = new ApolloClient({
    cache,
    link: mockLink,
  });
  const observable = apolloClientSubscribe(client, {
    query: SUBSCRIPTION,
    variables: {
      id: 'var',
    },
  });

  observable.subscribe(onNextFn);

  await new Promise(process.nextTick.bind(process));

  expect(onNextFn).toHaveBeenCalledWith({
    data: {
      valueType: {
        __typename: 'ValueType',
        value: 'var10',
      },
    },
  });
});
