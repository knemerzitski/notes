/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloServer } from '@apollo/server';
import { GraphQLResolveInfo } from 'graphql';
import { afterEach, beforeAll, expect, it, Mock, vi } from 'vitest';

import { expectGraphQLResponseData } from '../../__test__/helpers/graphql/response';
import { withPreFetchedArraySize } from './pre-execute';

let itemValueResolveFn: Mock;
let updateSizeInputFn: Mock;
let callbackReturnFn: Mock;
let indexFn: Mock;

let apolloServer: ApolloServer;

beforeAll(() => {
  itemValueResolveFn = vi.fn();
  updateSizeInputFn = vi.fn();
  callbackReturnFn = vi.fn();
  indexFn = vi.fn();

  apolloServer = new ApolloServer({
    typeDefs: `#graphql 
      type Query {
        itemsConnection: ItemsConnection!
      }
  
      type ItemsConnection {
        items: [Item!]!
      }
  
      type Item {
        value: String!
      }
    `,
    resolvers: {
      Query: {
        itemsConnection() {
          return {};
        },
      },
      ItemsConnection: {
        items(_parent: unknown, _args: unknown, ctx: unknown, info: GraphQLResolveInfo) {
          return withPreFetchedArraySize(
            (index, updateSize) => {
              indexFn(index);
              updateSize(updateSizeInputFn());
              return callbackReturnFn();
            },
            ctx,
            info
          );
        },
      },
      Item: {
        value: itemValueResolveFn,
      },
    },
  });
});

afterEach(() => {
  itemValueResolveFn.mockRestore();
  updateSizeInputFn.mockRestore();
  callbackReturnFn.mockRestore();
  indexFn.mockRestore();
});

async function execute() {
  const response = await apolloServer.executeOperation({
    query: `#graphql 
      query {
        itemsConnection {
          items {
            value
          }
        }
      }
    `,
  });

  return expectGraphQLResponseData(response);
}

it('returns empty array without any callback return value', async () => {
  await expect(execute()).resolves.toEqual({
    itemsConnection: {
      items: [],
    },
  });

  expect(
    itemValueResolveFn.mock.calls,
    'Resolver inside array item was not called'
  ).toStrictEqual([
    [undefined, expect.any(Object), expect.any(Object), expect.any(Object)],
  ]);
  expect(updateSizeInputFn.mock.calls).toStrictEqual([[]]);
  expect(callbackReturnFn.mock.calls).toStrictEqual([[]]);
  expect(
    indexFn.mock.calls,
    'withPreFetchedArraySize was not called with index 0'
  ).toStrictEqual([[0]]);
});

it('returns single item', async () => {
  itemValueResolveFn.mockImplementation((note) => note.text);
  updateSizeInputFn.mockReturnValue(1);
  callbackReturnFn.mockReturnValue({ text: 'hello' });

  await expect(execute()).resolves.toEqual({
    itemsConnection: {
      items: [
        {
          value: 'hello',
        },
      ],
    },
  });
  expect(indexFn.mock.calls).toStrictEqual([[0], [0]]);
});

it('returns two items', async () => {
  let count = 0;
  itemValueResolveFn.mockImplementation((note) => String(note.text) + String(count++));
  updateSizeInputFn.mockReturnValue(2);
  callbackReturnFn.mockReturnValue({ text: 'hello' });

  await expect(execute()).resolves.toEqual({
    itemsConnection: {
      items: [
        {
          value: 'hello1',
        },
        {
          value: 'hello2',
        },
      ],
    },
  });
  expect(indexFn.mock.calls).toStrictEqual([[0], [0], [1]]);
});
